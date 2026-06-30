import {
  Controller, Get, Post, Delete, Param,
  Body, Req, UseGuards,
  BadRequestException, NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { InstagramAccountsService } from './instagram-accounts.service';
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
export class InstagramAccountsController {
  constructor(
    private readonly service: InstagramAccountsService,
    private readonly authService: AuthService,
  ) {}

  private getTelegramId(req: Request): string {
    const token = parseCookieToken(req);
    if (!token) throw new BadRequestException('Token topilmadi');
    const payload = this.authService.verifyJwt(token);
    return String(payload.telegram_id);
  }

  /** Barcha ulangan Instagram akkauntlar */
  @Get('accounts')
  async getAccounts(@Req() req: Request) {
    const telegram_id = this.getTelegramId(req);
    const accounts = await this.service.findAllByTelegramId(telegram_id);
    return accounts.map(a => ({
      instagram_account_id: a.instagram_account_id,
      instagram_username: a.instagram_username,
      is_selected: a.is_selected,
    }));
  }

  /** Tanlangan (aktiv) akkaunt */
  @Get('account')
  async getAccount(@Req() req: Request) {
    const telegram_id = this.getTelegramId(req);
    const account = await this.service.findSelectedByTelegramId(telegram_id);
    if (!account || !account.access_token) {
      return { connected: false };
    }
    return {
      connected: true,
      instagram_account_id: account.instagram_account_id,
      instagram_username: account.instagram_username,
      is_selected: account.is_selected,
      app_id: account.app_id,
      has_app_secret: !!account.app_secret,
    };
  }

  /** Akkauntni tanlash */
  @Post('account/:igId/select')
  async selectAccount(@Req() req: Request, @Param('igId') igId: string) {
    const telegram_id = this.getTelegramId(req);
    const accounts = await this.service.findAllByTelegramId(telegram_id);
    const found = accounts.find(a => a.instagram_account_id === igId);
    if (!found) throw new NotFoundException('Akkaunt topilmadi');
    await this.service.selectAccount(telegram_id, igId);
    return { success: true };
  }

  /** Muayyan akkauntni uzish */
  @Delete('account/:igId')
  async disconnectAccount(@Req() req: Request, @Param('igId') igId: string) {
    const telegram_id = this.getTelegramId(req);
    await this.service.disconnectAccount(telegram_id, igId);
    const remaining = await this.service.findAllByTelegramId(telegram_id);
    return { connected: remaining.length > 0 };
  }

  /** @deprecated — eski /account/disconnect endpoint (backward compat) */
  @Delete('account/disconnect')
  async disconnectLegacy(@Req() req: Request) {
    const telegram_id = this.getTelegramId(req);
    await this.service.disconnect(telegram_id);
    return { connected: false };
  }

  /** Token orqali akkauntni ulash — ID tokendan avtomatik olinadi */
  @Post('account/connect')
  async connect(
    @Req() req: Request,
    @Body() body: {
      access_token: string;
      instagram_account_id?: string; // endi ixtiyoriy
      app_id?: string;
      app_secret?: string;
    },
  ) {
    const telegram_id = this.getTelegramId(req);

    if (!body.access_token) {
      throw new BadRequestException('access_token talab qilinadi');
    }

    // /me endpoint orqali haqiqiy ID olinadi — webhook entry.id bilan mos keladi
    let igInfo: any;
    try {
      igInfo = await this.service.fetchMe(body.access_token);
    } catch (err: any) {
      throw new BadRequestException(
        `Instagram token noto'g'ri: ${err.response?.data?.error?.message || err.message}`,
      );
    }

    const account = await this.service.upsertByIgId(telegram_id, igInfo.id, {
      access_token: body.access_token,
      instagram_username: igInfo.username,
      app_id: body.app_id || null,
      app_secret: body.app_secret || null,
      is_active: true,
    });

    return {
      connected: true,
      instagram_account_id: account.instagram_account_id,
      instagram_username: account.instagram_username,
    };
  }
}
