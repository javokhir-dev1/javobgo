import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { TelegramUser } from '../telegram/telegram-user.entity';

/**
 * Telegram Bot API orqali xabar yuborish (backend tomonidan).
 * Botning o'zi alohida servis, lekin backend to'g'ridan-to'g'ri
 * sendMessage chaqirib admin/foydalanuvchiga xabar bera oladi.
 */
@Injectable()
export class TelegramNotifyService {
  private readonly logger = new Logger(TelegramNotifyService.name);

  constructor(
    @InjectRepository(TelegramUser)
    private userRepo: Repository<TelegramUser>,
  ) {}

  private get botToken(): string | undefined {
    return process.env.TELEGRAM_BOT_TOKEN;
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    if (!this.botToken || !chatId) return;
    try {
      await axios.post(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      });
    } catch (e: any) {
      this.logger.error(`Telegram sendMessage xato (${chatId}): ${e.message}`);
    }
  }

  /** role='admin' bo'lgan barcha foydalanuvchilarga xabar yuboradi */
  async notifyAdmins(text: string): Promise<void> {
    const admins = await this.userRepo.find({ where: { role: 'admin' } });
    if (!admins.length) {
      this.logger.warn('Admin topilmadi — murojaat hech kimga yuborilmadi');
      return;
    }
    await Promise.all(admins.map((a) => this.sendMessage(a.telegram_id, text)));
  }
}
