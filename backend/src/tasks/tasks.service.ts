import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { AuthToken } from '../auth/auth-token.entity';
import { InstagramAccount } from '../instagram-accounts/instagram-account.entity';
import axios from 'axios';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const TEN_DAYS_MS = 10 * ONE_DAY_MS;

@Injectable()
export class TasksService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TasksService.name);
  private timers: NodeJS.Timeout[] = [];

  constructor(
    @InjectRepository(AuthToken)
    private tokenRepo: Repository<AuthToken>,
    @InjectRepository(InstagramAccount)
    private igRepo: Repository<InstagramAccount>,
  ) {}

  onModuleInit() {
    // Expired AuthToken larni har kecha soat 03:00 da tozalash
    this.scheduleDaily(3, 0, () => this.cleanExpiredAuthTokens());
    // Muddati yaqin IG tokenlarni har kecha soat 04:00 da yangilash
    this.scheduleDaily(4, 0, () => this.refreshExpiringTokens());
    this.logger.log('Kunlik cron job lar ishga tushdi');

  }

  onModuleDestroy() {
    this.timers.forEach(t => clearTimeout(t));
  }

  /** Berilgan soat/daqiqada har kuni ishga tushadigan cron */
  private scheduleDaily(hour: number, minute: number, fn: () => Promise<void>) {
    const tick = () => {
      fn().catch(err => this.logger.error(`Cron xato: ${err.message}`));
      // Keyingi kunni rejalash
      const timer = setTimeout(tick, ONE_DAY_MS);
      this.timers.push(timer);
    };

    const now = new Date();
    const next = new Date(now);
    next.setHours(hour, minute, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const delay = next.getTime() - now.getTime();

    const timer = setTimeout(tick, delay);
    this.timers.push(timer);
    this.logger.log(
      `Cron rejalandi: ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ` +
      `(${Math.round(delay / 60000)} daqiqadan keyin)`,
    );
  }

  /** Muddati o'tgan AuthToken larni o'chirish */
  async cleanExpiredAuthTokens(): Promise<void> {
    const cutoff = new Date(Date.now() - ONE_DAY_MS);
    const result = await this.tokenRepo.delete({ expires_at: LessThan(cutoff) });
    this.logger.log(`Tozalandi: ${result.affected ?? 0} ta eskirgan AuthToken`);
  }

  /** Muddati 10 kun yoki kamroq qolgan IG tokenlarni yangilash */
  async refreshExpiringTokens(): Promise<void> {
    const threshold = new Date(Date.now() + TEN_DAYS_MS);
    const accounts = await this.igRepo.find({
      where: { is_active: true },
    });

    const expiring = accounts.filter(
      acc => acc.token_expires_at && new Date(acc.token_expires_at) <= threshold,
    );

    if (!expiring.length) {
      this.logger.log('Muddati yaqin IG token topilmadi');
      return;
    }

    this.logger.log(`${expiring.length} ta IG token yangilanmoqda...`);

    for (const acc of expiring) {
      try {
        const res = await axios.get('https://graph.instagram.com/refresh_access_token', {
          params: {
            grant_type: 'ig_refresh_token',
            access_token: acc.access_token,
          },
        });
        const newToken: string = res.data.access_token;
        const expiresIn: number = res.data.expires_in ?? 5184000;
        const token_expires_at = new Date(Date.now() + expiresIn * 1000);

        await this.igRepo.update({ id: acc.id }, { access_token: newToken, token_expires_at });
        this.logger.log(`Token yangilandi: @${acc.instagram_username} (${acc.instagram_account_id})`);
      } catch (err) {
        this.logger.error(
          `Token yangilashda xato: @${acc.instagram_username} — ${err.message}`,
        );
        // Foydalanuvchiga Telegram orqali xabar yuborish
        await this.notifyTelegramUser(acc);
      }
    }
  }

  private async notifyTelegramUser(acc: InstagramAccount): Promise<void> {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken || !acc.telegram_id) return;
    try {
      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: acc.telegram_id,
        text:
          `⚠️ <b>Instagram token muddati tugayapti!</b>\n\n` +
          `Akkaunt: @${acc.instagram_username || acc.instagram_account_id}\n` +
          `Muddati: ${acc.token_expires_at?.toLocaleDateString('uz-UZ') ?? 'noma\'lum'}\n\n` +
          `Iltimos, Instagram akkauntingizni qayta ulang.`,
        parse_mode: 'HTML',
      });
    } catch (e) {
      this.logger.error(`Telegram xabar yuborishda xato: ${e.message}`);
    }
  }
}
