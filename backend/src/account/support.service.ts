import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportRequest, SupportRequestType } from './entities/support-request.entity';
import { TelegramUser } from '../telegram/telegram-user.entity';
import { TelegramNotifyService } from './telegram-notify.service';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    @InjectRepository(SupportRequest)
    private repo: Repository<SupportRequest>,
    @InjectRepository(TelegramUser)
    private userRepo: Repository<TelegramUser>,
    private notify: TelegramNotifyService,
  ) {}

  async create(params: {
    telegram_id: string;
    message: string;
    type?: SupportRequestType;
    from_name?: string | null;
  }): Promise<SupportRequest> {
    const user = params.from_name
      ? null
      : await this.userRepo.findOne({ where: { telegram_id: params.telegram_id } });
    const fromName = params.from_name
      ?? (user ? `${user.first_name}${user.username ? ' (@' + user.username + ')' : ''}` : null);

    const saved = await this.repo.save(
      this.repo.create({
        telegram_id: params.telegram_id,
        message: params.message.slice(0, 4000),
        type: params.type ?? 'general',
        from_name: fromName,
        status: 'new',
      }),
    );

    // Adminlarga Telegram orqali yo'naltirish
    const typeLabel = saved.type === 'data_deletion' ? "🗑 Ma'lumot o'chirish" : '✉️ Murojaat';
    await this.notify.notifyAdmins(
      `<b>${typeLabel}</b>\n\n` +
      `<b>Kimdan:</b> ${fromName ?? saved.telegram_id}\n` +
      `<b>Telegram ID:</b> <code>${saved.telegram_id}</code>\n` +
      `<b>#${saved.id}</b>\n\n` +
      `${this.escape(saved.message)}`,
    );

    return saved;
  }

  findAll(status?: 'new' | 'resolved'): Promise<SupportRequest[]> {
    const where = status ? { status } : {};
    return this.repo.find({ where, order: { created_at: 'DESC' } });
  }

  async resolve(id: number): Promise<SupportRequest | null> {
    await this.repo.update({ id }, { status: 'resolved', resolved_at: new Date() });
    return this.repo.findOne({ where: { id } });
  }

  private escape(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
