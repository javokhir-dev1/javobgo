import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { InstagramAccountsService } from '../instagram-accounts/instagram-accounts.service';

/**
 * JWT dan telegram_id oladi, so'ng tanlangan Instagram account ID ni qaytaradi.
 * Hech qanday akkaunt ulangan bo'lmasa null qaytaradi.
 */
export async function extractActiveIgId(
  req: Request,
  jwtService: JwtService,
  igAccountsService: InstagramAccountsService,
): Promise<string | null> {
  const token = req.cookies?.['tg_access_token'];
  if (!token) return null;
  const payload = jwtService.verify(token);
  const telegramId = String(payload?.telegram_id);
  if (!telegramId) return null;
  const account = await igAccountsService.findSelectedByTelegramId(telegramId);
  return account?.instagram_account_id ?? null;
}
