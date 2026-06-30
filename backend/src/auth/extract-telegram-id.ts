import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';

export function extractTelegramId(req: Request, jwtService: JwtService): string {
  const token = req.cookies?.['tg_access_token'];
  if (!token) throw new UnauthorizedException('Cookie topilmadi');

  const payload = jwtService.verify(token);
  const telegramId = payload?.telegram_id;
  if (!telegramId) throw new UnauthorizedException('Token noto\'g\'ri');

  return String(telegramId);
}
