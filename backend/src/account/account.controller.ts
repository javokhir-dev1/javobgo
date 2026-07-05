import { Controller, Post, Delete, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { extractTelegramId } from '../auth/extract-telegram-id';
import { AccountDeletionService } from './account-deletion.service';
import { SupportService } from './support.service';

@Controller('api/account')
export class AccountController {
  constructor(
    private readonly jwtService: JwtService,
    private readonly deletion: AccountDeletionService,
    private readonly support: SupportService,
  ) {}

  private tid(req: Request) {
    return extractTelegramId(req, this.jwtService);
  }

  /** Hisobni o'chirishni so'rash — 90 kunlik grace period boshlanadi, foydalanuvchi logout qilinadi */
  @Delete('me')
  async requestDeletion(@Req() req: Request, @Res() res: Response) {
    const telegram_id = this.tid(req);
    const { purge_at } = await this.deletion.requestDeletion(telegram_id);

    // Adminlarni xabardor qilamiz
    await this.support.create({
      telegram_id,
      type: 'data_deletion',
      message: 'Foydalanuvchi hisobni o\'chirishni so\'radi (sayt orqali).',
    });

    res.clearCookie('tg_access_token', { path: '/' });
    return res.json({ ok: true, purge_at, grace_days: 90 });
  }

  /** Grace period ichida hisobni tiklash */
  @Post('me/restore')
  async restore(@Req() req: Request, @Res() res: Response) {
    const telegram_id = this.tid(req);
    await this.deletion.cancelDeletion(telegram_id);
    return res.json({ ok: true });
  }
}
