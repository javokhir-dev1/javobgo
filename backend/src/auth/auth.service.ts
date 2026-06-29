import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramUser } from '../telegram/telegram-user.entity';
import { AuthToken } from './auth-token.entity';

const INIT_DATA_MAX_AGE_SEC = 300;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    @InjectRepository(TelegramUser)
    private telegramUserRepo: Repository<TelegramUser>,
    @InjectRepository(AuthToken)
    private tokenRepo: Repository<AuthToken>,
  ) {}

  async verifyAuthToken(token: string): Promise<{ jwt: string; user: TelegramUser } | null> {
    return this.validateTelegramToken(token);
  }

  async validateTelegramToken(token: string): Promise<{ jwt: string; user: TelegramUser } | null> {
    const authToken = await this.tokenRepo.findOne({ where: { token, is_used: false } });
    if (!authToken) return null;
    if (new Date() > authToken.expires_at) {
      this.logger.warn('OTP muddati tugagan');
      return null;
    }
    authToken.is_used = true;
    await this.tokenRepo.save(authToken);

    if (authToken.message_id) {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (botToken) {
        fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: authToken.telegram_id,
            message_id: authToken.message_id,
            text: '✅ Tizimga kirdingiz.\n\nQayta kirish uchun botga /start deb yozing.',
            reply_markup: { inline_keyboard: [] }
          })
        }).catch(e => this.logger.error('Telegram xabarni tahrirlashda xato:', e));
      }
    }

    const user = await this.telegramUserRepo.findOne({ where: { telegram_id: authToken.telegram_id } });
    if (!user) return null;
    const payload = {
      sub: user.telegram_id,
      telegram_id: user.telegram_id,
      first_name: user.first_name,
      username: user.username,
      auth_type: 'telegram',
    };
    const jwt = this.jwtService.sign(payload, { expiresIn: '7d' });
    return { jwt, user };
  }

  validateTelegramInitData(initData: string): any {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) return null;

    const authDateStr = urlParams.get('auth_date');
    if (!authDateStr) {
      this.logger.warn("initData: auth_date yo'q");
      return null;
    }
    const authDate = parseInt(authDateStr, 10);
    const nowSec = Math.floor(Date.now() / 1000);
    if (isNaN(authDate) || nowSec - authDate > INIT_DATA_MAX_AGE_SEC) {
      this.logger.warn(`initData: auth_date eskirgan (${nowSec - authDate}s)`);
      return null;
    }

    urlParams.delete('hash');
    const keys = Array.from(urlParams.keys()).sort();
    const dataCheckString = keys.map(k => `${k}=${urlParams.get(k)}`).join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData')
      .update(process.env.TELEGRAM_BOT_TOKEN || '')
      .digest();

    const calculatedHash = crypto.createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    const hashBuf     = Buffer.from(hash);
    const expectedBuf = Buffer.from(calculatedHash);
    if (hashBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(hashBuf, expectedBuf)) {
      this.logger.warn('initData: HMAC imzo mos kelmadi');
      return null;
    }

    const userStr = urlParams.get('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  async authenticateTelegramWebApp(initData: string): Promise<{ jwt: string; user: TelegramUser } | null> {
    const tgUser = this.validateTelegramInitData(initData);
    if (!tgUser || !tgUser.id) {
      this.logger.warn('authenticateTelegramWebApp: initData tekshiruvi muvaffaqiyatsiz');
      return null;
    }
    const telegram_id = String(tgUser.id);
    let user = await this.telegramUserRepo.findOne({ where: { telegram_id } });
    if (!user) {
      user = this.telegramUserRepo.create({
        telegram_id,
        first_name: tgUser.first_name || 'Foydalanuvchi',
        username: tgUser.username || null,
      });
      await this.telegramUserRepo.save(user);
    }
    const payload = {
      sub: user.telegram_id,
      telegram_id: user.telegram_id,
      first_name: user.first_name,
      username: user.username,
      auth_type: 'telegram',
    };
    const jwt = this.jwtService.sign(payload, { expiresIn: '7d' });
    return { jwt, user };
  }

  async updateAvatar(telegram_id: string, avatarUrl: string): Promise<void> {
    await this.telegramUserRepo.update({ telegram_id }, { avatar_url: avatarUrl });
  }

  async updateProfile(telegram_id: string, data: { first_name?: string }): Promise<void> {
    const update: Partial<{ first_name: string }> = {};
    if (data.first_name?.trim()) update.first_name = data.first_name.trim();
    if (Object.keys(update).length) {
      await this.telegramUserRepo.update({ telegram_id }, update);
    }
  }

  async findUserByTelegramId(telegram_id: string): Promise<TelegramUser | null> {
    return this.telegramUserRepo.findOne({ where: { telegram_id } });
  }

  verifyJwt(token: string): any {
    try {
      return this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException("Notogri yoki muddati otgan token");
    }
  }
}
