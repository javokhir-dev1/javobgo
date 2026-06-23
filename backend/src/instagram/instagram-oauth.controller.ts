import {
  Controller, Get, Query, Req, Res, UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express';
import axios from 'axios';
import { CookieAuthGuard } from '../auth/cookie-auth.guard';
import { AuthService } from '../auth/auth.service';
import { InstagramAccountsService } from '../instagram-accounts/instagram-accounts.service';

@Controller('api/instagram/oauth')
export class InstagramOAuthController {
  constructor(
    private auth: AuthService,
    private igAccounts: InstagramAccountsService,
    private config: ConfigService,
  ) {}

  // ─── 1. Instagram OAuth URL qaytaradi ───
  @Get('url')
  @UseGuards(CookieAuthGuard)
  getUrl(@Req() req: Request) {
    const token = (req as any).cookies?.['tg_access_token'];
    const payload = this.auth.verifyJwt(token);
    const telegramId = String(payload.telegram_id);

    const appId      = this.config.get('INSTAGRAM_APP_ID');
    const backendUrl = this.config.get('BACKEND_PUBLIC_URL');
    const redirectUri = `${backendUrl}/api/instagram/oauth/callback`;

    // Instagram OAuth — Facebook emas
    const url = `https://www.instagram.com/oauth/authorize`
      + `?enable_fb_login=0`
      + `&force_reauth=1`
      + `&client_id=${appId}`
      + `&redirect_uri=${encodeURIComponent(redirectUri)}`
      + `&response_type=code`
      + `&scope=instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish`
      + `&state=${telegramId}`;

    return { url };
  }

  // ─── 2. Instagram callback — code → token → DB ───
  @Get('callback')
  async callback(
    @Query('code')  code: string,
    @Query('state') telegramId: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
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

      // 1. Qisqa muddatli token olish
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
        shortToken  = tokenRes.data.access_token;
        igUserId    = String(tokenRes.data.user_id);
      } catch (err) {
        console.error('[OAuth] 1-qadamda (short token) xato:', err.response?.data || err.message);
        throw err;
      }

      // 2. Uzoq muddatli token (60 kun)
      let longToken = shortToken;
      try {
        const longRes = await axios.get('https://graph.instagram.com/access_token', {
          params: {
            grant_type: 'ig_exchange_token',
            client_secret: appSecret,
            access_token: shortToken,
          },
        });
        longToken = longRes.data.access_token || shortToken;
        console.log('[OAuth] Uzoq muddatli token muvaffaqiyatli olindi.');
      } catch (err: any) {
        console.warn('[OAuth] ig_exchange_token xato (bu jiddiy emas, short token bilan davom etamiz):', err.response?.data || err.message);
      }

      // 3. Instagram username olish
      let igUsername: string | null = null;
      let igUserIdFromMe: string | null = null;
      try {
        const infoRes = await axios.get(`https://graph.instagram.com/v25.0/me`, {
          params: { fields: 'user_id,username', access_token: longToken },
        });
        igUsername = infoRes.data.username || null;
        igUserIdFromMe = infoRes.data.user_id || igUserId;
        console.log('[OAuth] Username olindi:', igUsername);
      } catch (err: any) {
        console.error('[OAuth] Username olishda xato:', err.response?.data || err.message);
        throw new Error("Foydalanuvchi ma'lumotlarini olib bo'lmadi. App ID noto'g'ri bo'lishi mumkin.");
      }

      // 4. DB ga saqlash
      const finalIgId = igUserIdFromMe || igUserId;
      await this.igAccounts.upsertByIgId(telegramId, finalIgId, {
        instagram_username: igUsername,
        access_token: longToken,
        app_id: appId,
        app_secret: appSecret,
        is_active: true,
      });

      return res.send(this.html({
        success: true,
        instagram_username: igUsername,
        instagram_account_id: finalIgId,
      }));

    } catch (err: any) {
      const msg = err.response?.data?.error_message
        || err.response?.data?.error?.message
        || err.message;
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
