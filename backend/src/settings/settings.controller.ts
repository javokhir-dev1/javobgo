import { Controller, Get, Patch, Body, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { CookieAuthGuard } from '../auth/cookie-auth.guard';
import { AuthService } from '../auth/auth.service';
import { InstagramAccountsService } from '../instagram-accounts/instagram-accounts.service';
import { JwtService } from '@nestjs/jwt';

@UseGuards(CookieAuthGuard)
@Controller('api/settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly authService: AuthService,
    private readonly igAccountsService: InstagramAccountsService,
    private readonly jwtService: JwtService,
  ) {}

  private async getIgAccountId(req: Request): Promise<string> {
    const token = (req as any).cookies?.['tg_access_token'];
    if (!token) throw new UnauthorizedException('Cookie topilmadi');
    const payload = this.jwtService.verify(token);
    const telegramId = String(payload?.telegram_id);
    const account = await this.igAccountsService.findSelectedByTelegramId(telegramId);
    if (!account) throw new UnauthorizedException('Ulangan Instagram akkaunt topilmadi');
    return account.instagram_account_id;
  }

  @Get()
  async get(@Req() req: Request) {
    const igId = await this.getIgAccountId(req);
    const settings = await this.settingsService.get(igId);
    return { success: true, settings };
  }

  @Patch()
  async update(@Req() req: Request, @Body() dto: UpdateSettingsDto) {
    const igId = await this.getIgAccountId(req);
    const settings = await this.settingsService.update(igId, dto);
    return { success: true, settings };
  }
}
