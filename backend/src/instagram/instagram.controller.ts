import {
  Controller, Get, Req, UseGuards, BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { InstagramService } from './instagram.service';
import { InstagramAccountsService } from '../instagram-accounts/instagram-accounts.service';
import { CookieAuthGuard } from '../auth/cookie-auth.guard';
import { AuthService } from '../auth/auth.service';

function parseCookieToken(req: Request): string | null {
  const cookieHeader = req.headers.cookie || '';
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(part => {
    const [k, ...v] = part.trim().split('=');
    if (k) cookies[k.trim()] = v.join('=').trim();
  });
  return cookies['tg_access_token'] || null;
}

@Controller('api/instagram')
@UseGuards(CookieAuthGuard)
export class InstagramController {
  constructor(
    private readonly instagram: InstagramService,
    private readonly accounts: InstagramAccountsService,
    private readonly authService: AuthService,
  ) {}

  private getTelegramId(req: Request): string {
    const token = parseCookieToken(req);
    if (!token) throw new BadRequestException('Token topilmadi');
    const payload = this.authService.verifyJwt(token);
    return payload.telegram_id;
  }

  @Get('status')
  async status(@Req() req: Request) {
    const telegram_id = this.getTelegramId(req);
    const account = await this.accounts.findByTelegramId(telegram_id);

    if (!account?.access_token || !account?.instagram_account_id) {
      return { success: true, connected: false };
    }

    try {
      const info = await this.instagram.getAccountInfo({
        token: account.access_token,
        accountId: account.instagram_account_id,
      });
      return { success: true, connected: true, account: info };
    } catch (err) {
      return { success: false, connected: false, message: err.message };
    }
  }

  @Get('posts')
  async posts(@Req() req: Request) {
    const telegram_id = this.getTelegramId(req);
    const account = await this.accounts.findByTelegramId(telegram_id);

    if (!account?.access_token || !account?.instagram_account_id) {
      return { success: false, posts: [], message: 'Instagram hisobi ulanmagan' };
    }

    try {
      const posts = await this.instagram.getRecentPosts(
        { token: account.access_token, accountId: account.instagram_account_id },
        20,
      );
      return { success: true, posts };
    } catch (err) {
      return { success: false, posts: [], message: err.message };
    }
  }
}
