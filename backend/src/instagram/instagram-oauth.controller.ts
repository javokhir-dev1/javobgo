import {
  Controller, Get, Query, Req, Res, UseGuards, Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express';
import * as crypto from 'crypto';
import axios from 'axios';
import { CookieAuthGuard } from '../auth/cookie-auth.guard';
import { AuthService } from '../auth/auth.service';
import { InstagramAccountsService } from '../instagram-accounts/instagram-accounts.service';

@Controller('api/instagram/oauth')
export class InstagramOAuthController {
  private readonly logger = new Logger(InstagramOAuthController.name);

  constructor(
    private auth: AuthService,
    private igAccounts: InstagramAccountsService,
    private config: ConfigService,
  ) {}

  private signState(telegramId: string): string {
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET sozlanmagan');
    const ts = Date.now().toString();
    const payload = Buffer.from(`${telegramId}:${ts}`).toString('base64url');
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return `${payload}.${sig}`;
  }

  private verifyState(state: string): string | null {
    try {
      const [payload, sig] = state.split('.');
      if (!payload || !sig) return null;
      const secret = this.config.get<string>('JWT_SECRET');
      if (!secret) return null;
      const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
      const decoded = Buffer.from(payload, 'base64url').toString();
      const [telegramId, ts] = decoded.split(':');
      if (Date.now() - Number(ts) > 10 * 60 * 1000) return null;
      return telegramId;
    } catch {
      return null;
    }
  }

  @Get('url')
  @UseGuards(CookieAuthGuard)
  getUrl(@Req() req: Request) {
    const token = (req as any).cookies?.['tg_access_token'];
    const payload = this.auth.verifyJwt(token);
    const telegramId = String(payload.telegram_id);
    const appId      = this.config.get('INSTAGRAM_APP_ID');
    const backendUrl = this.config.get('BACKEND_PUBLIC_URL');
    const redirectUri = `${backendUrl}/api/instagram/oauth/callback`;
    const state = this.signState(telegramId);
    const url = `https://www.instagram.com/oauth/authorize`
      + `?enable_fb_login=0`
      + `&force_reauth=1`
      + `&client_id=${appId}`
      + `&redirect_uri=${encodeURIComponent(redirectUri)}`
      + `&response_type=code`
      + `&scope=instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish`
      + `&state=${encodeURIComponent(state)}`;
    return { url };
  }

  @Get('callback')
  async callback(
    @Query('code')  code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const telegramId = this.verifyState(state || '');
    if (!telegramId && !error) {
      this.logger.warn('OAuth callback: state tekshiruvi muvaffaqiyatsiz');
      return res.send(this.html({ success: false, error: 'invalid_state' }));
    }
    if (error || !code) {
      return res.send(this.html({ success: false, error: error || 'cancelled' }));
    }

    try {
      const appId      = this.config.get('INSTAGRAM_APP_ID');
      const appSecret  = this.config.get('INSTAGRAM_APP_SECRET');
      const backendUrl = this.config.get('BACKEND_PUBLIC_URL');
      const redirectUri = `${backendUrl}/api/instagram/oauth/callback`;

      let shortToken: string;
      let igUserId: string;

      try {
        const tokenRes = await axios.post(
          'https://api.instagram.com/oauth/access_token',
          new URLSearchParams({
            client_id: appId,
            client_secret: appSecret,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
            code,
          }),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        );
        shortToken = tokenRes.data.access_token;
        igUserId   = String(tokenRes.data.user_id);
      } catch (err: any) {
        this.logger.error(`[OAuth] Short token xato: ${err.response?.data?.error_message || err.message}`);
        throw err;
      }

      let longToken = shortToken;
      let tokenExpiresAt: Date | null = null;
      try {
        const longRes = await axios.get('https://graph.instagram.com/access_token', {
          params: { grant_type: 'ig_exchange_token', client_secret: appSecret, access_token: shortToken },
        });
        longToken = longRes.data.access_token || shortToken;
        // Instagram long token ~60 kun (5184000 sekund)
        const expiresIn: number = longRes.data.expires_in || 5184000;
        tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
        this.logger.log('[OAuth] Uzoq muddatli token muvaffaqiyatli olindi.');
      } catch (err: any) {
        this.logger.warn(`[OAuth] ig_exchange_token xato: ${err.response?.data?.error?.message || err.message}`);
        // Fallback: 60 kundan keyin tugaydi deb hisoblash
        tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
      }

      let igUsername: string | null = null;
      let igUserIdFromMe: string | null = null;
      try {
        const infoRes = await axios.get('https://graph.instagram.com/v25.0/me', {
          params: { fields: 'user_id,username', access_token: longToken },
        });
        igUsername     = infoRes.data.username || null;
        igUserIdFromMe = infoRes.data.user_id || igUserId;
        this.logger.log(`[OAuth] Username olindi: ${igUsername}`);
      } catch (err: any) {
        this.logger.error(`[OAuth] Username olishda xato: ${err.response?.data?.error?.message || err.message}`);
        throw new Error("Foydalanuvchi ma'lumotlarini olib bo'lmadi.");
      }

      const finalIgId = igUserIdFromMe || igUserId;
      await this.igAccounts.upsertByIgId(telegramId, finalIgId, {
        instagram_username: igUsername,
        access_token: longToken,
        app_id: appId,
        app_secret: appSecret,
        is_active: true,
        token_expires_at: tokenExpiresAt,
      });

      // Webhook eventlarni qabul qilish uchun akkauntni subscribe qilamiz
      try {
        await axios.post(
          `https://graph.facebook.com/v21.0/${finalIgId}/subscribed_apps`,
          null,
          {
            params: {
              subscribed_fields: 'messages,comments',
              access_token: longToken,
            },
          },
        );
        this.logger.log(`[OAuth] Webhook subscription muvaffaqiyatli: ${finalIgId}`);
      } catch (err: any) {
        this.logger.warn(
          `[OAuth] Webhook subscription xato (ilovani ishlatish davom etadi): ` +
          (err.response?.data?.error?.message || err.message),
        );
      }

      return res.send(this.html({ success: true, instagram_username: igUsername, instagram_account_id: finalIgId }));

    } catch (err: any) {
      const msg = err.response?.data?.error_message || err.response?.data?.error?.message || err.message;
      return res.send(this.html({ success: false, error: msg }));
    }
  }

  private html(data: object): string {
    const json = JSON.stringify(data);
    return `<!DOCTYPE html>
<html lang="uz">
<head><meta charset="UTF-8"><title>Instagram ulash</title>
<style>
  body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;
       height:100vh;margin:0;background:#0a0a0a;color:#fff;}
  .box{text-align:center;padding:32px;background:#1a1a1a;border-radius:16px;}
</style></head>
<body><div class="box">
  <p>${(data as any).success ? '✅ Muvaffaqiyatli ulandi! Oyna yopilmoqda...' : '❌ Xato: ' + (data as any).error}</p>
</div>
<script>
  try { if(window.opener) window.opener.postMessage(${json},'*'); } catch(e){}
  setTimeout(function(){ window.close(); }, 1500);
</script></body></html>`;
  }
}
