import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { TelegramUser } from '../telegram/telegram-user.entity';
import { AuthToken } from './auth-token.entity';
import { InstagramAccount } from '../instagram-accounts/instagram-account.entity';
import { hashPassword, verifyPassword, normalizeEmail } from '../common/password.util';

const INIT_DATA_MAX_AGE_SEC = 300;

/**
 * Email orqali kirgan foydalanuvchilar uchun sintetik telegram_id diapazoni boshlanishi.
 *
 * Butun tizim (instagram_accounts, agents, automations, logs, settings) telegram_id
 * ustuniga bog'langan. Email foydalanuvchisiga ham shu maydonda qiymat kerak.
 * 1e17 — Telegram ID lari uchun e'lon qilingan yuqori chegaradan (2^52 ≈ 4.5e15)
 * ancha baland, ya'ni haqiqiy Telegram ID bilan hech qachon to'qnashmaydi.
 */
const SYNTHETIC_ID_BASE = 100_000_000_000_000_000n;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    @InjectRepository(TelegramUser)
    private telegramUserRepo: Repository<TelegramUser>,
    @InjectRepository(AuthToken)
    private tokenRepo: Repository<AuthToken>,
    @InjectRepository(InstagramAccount)
    private igRepo: Repository<InstagramAccount>,
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
    await this.restoreIfPendingDeletion(user);
    const payload = {
      sub: user.telegram_id,
      telegram_id: user.telegram_id,
      first_name: user.first_name,
      username: user.username,
      auth_type: 'telegram',
    };
    const jwt = this.jwtService.sign(payload, { expiresIn: '15d' });
    return { jwt, user };
  }

  /** Grace period ichida qayta kirilса — o'chirish so'rovini bekor qiladi */
  private async restoreIfPendingDeletion(user: TelegramUser): Promise<void> {
    if ((user as any).deleted_at) {
      await this.telegramUserRepo.update({ telegram_id: user.telegram_id }, { deleted_at: null } as any);
      // Botni qayta yoqamiz (o'chirish so'ralganda pauza qilingan edi)
      await this.igRepo.update({ telegram_id: user.telegram_id }, { is_active: true });
      (user as any).deleted_at = null;
      this.logger.log(`O'chirish avtomatik bekor qilindi (login): ${user.telegram_id}`);
    }
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
    await this.restoreIfPendingDeletion(user);
    const payload = {
      sub: user.telegram_id,
      telegram_id: user.telegram_id,
      first_name: user.first_name,
      username: user.username,
      auth_type: 'telegram',
    };
    const jwt = this.jwtService.sign(payload, { expiresIn: '15d' });
    return { jwt, user };
  }

  // ─── Email + parol ───────────────────────────────────────────────────────────

  /** Email foydalanuvchisi uchun bo'sh sintetik telegram_id topadi */
  private async nextSyntheticId(): Promise<string> {
    const last = await this.telegramUserRepo.findOne({
      where: { telegram_id: MoreThanOrEqual(SYNTHETIC_ID_BASE.toString()) },
      order: { telegram_id: 'DESC' },
    });
    const next = last ? BigInt(last.telegram_id) + 1n : SYNTHETIC_ID_BASE;
    return next.toString();
  }

  private signUser(user: TelegramUser): string {
    return this.jwtService.sign(
      {
        sub: user.telegram_id,
        telegram_id: user.telegram_id,
        first_name: user.first_name,
        username: user.username,
        auth_type: user.auth_type ?? 'telegram',
      },
      { expiresIn: '15d' },
    );
  }

  async registerWithEmail(
    email: string,
    password: string,
    first_name: string,
  ): Promise<{ jwt: string; user: TelegramUser }> {
    const normalized = normalizeEmail(email);

    const existing = await this.telegramUserRepo.findOne({ where: { email: normalized } });
    if (existing) throw new ConflictException('email_taken');

    const password_hash = await hashPassword(password);

    // Unique cheklovga bir vaqtda ikkita so'rov urilib qolsa — qayta urinamiz
    for (let attempt = 1; attempt <= 3; attempt++) {
      const telegram_id = await this.nextSyntheticId();
      try {
        const user = await this.telegramUserRepo.save(
          this.telegramUserRepo.create({
            telegram_id,
            first_name: first_name.trim(),
            username: null,
            auth_type: 'email',
            email: normalized,
            password_hash,
          }),
        );
        this.logger.log(`Yangi email hisob: ${normalized} (id=${telegram_id})`);
        return { jwt: this.signUser(user), user };
      } catch (err: any) {
        // 23505 = unique_violation. Email bo'yicha bo'lsa — poyga, hisob band.
        if (err?.code === '23505' && String(err?.detail || '').includes('email')) {
          throw new ConflictException('email_taken');
        }
        if (attempt === 3) throw err;
        this.logger.warn(`Sintetik ID to'qnashuvi, urinish ${attempt}/3`);
      }
    }
    throw new ConflictException('email_taken');
  }

  async loginWithEmail(email: string, password: string): Promise<{ jwt: string; user: TelegramUser } | null> {
    const normalized = normalizeEmail(email);
    const user = await this.telegramUserRepo.findOne({ where: { email: normalized } });

    // Foydalanuvchi topilmasa ham hash tekshirgandek vaqt sarflaymiz —
    // javob tezligiga qarab email ro'yxatdan o'tganini aniqlab bo'lmasin
    if (!user?.password_hash) {
      await verifyPassword(password, 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA');
      return null;
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) return null;

    await this.restoreIfPendingDeletion(user);
    return { jwt: this.signUser(user), user };
  }

  async updateAvatar(telegram_id: string, avatarUrl: string): Promise<void> {
    await this.telegramUserRepo.update({ telegram_id }, { avatar_url: avatarUrl });
  }

  async updateProfile(telegram_id: string, data: { first_name?: string; language?: string }): Promise<void> {
    const update: Partial<{ first_name: string; language: string }> = {};
    if (data.first_name?.trim()) update.first_name = data.first_name.trim();
    if (data.language?.trim()) update.language = data.language.trim();
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
