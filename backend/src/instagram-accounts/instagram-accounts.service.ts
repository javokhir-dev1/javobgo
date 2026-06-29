import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { InstagramAccount } from './instagram-account.entity';
import axios from 'axios';

const BASE_URL = 'https://graph.instagram.com/v21.0';

@Injectable()
export class InstagramAccountsService {
  private readonly logger = new Logger(InstagramAccountsService.name);

  constructor(
    @InjectRepository(InstagramAccount)
    private repo: Repository<InstagramAccount>,
    private dataSource: DataSource,
  ) {}

  async findAllByTelegramId(telegram_id: string): Promise<InstagramAccount[]> {
    return this.repo.find({ where: { telegram_id, is_active: true } });
  }

  async findSelectedByTelegramId(telegram_id: string): Promise<InstagramAccount | null> {
    let acc = await this.repo.findOne({ where: { telegram_id, is_selected: true, is_active: true } });
    if (!acc) {
      acc = await this.repo.findOne({ where: { telegram_id, is_active: true } });
    }
    return acc;
  }

  /** @deprecated findSelectedByTelegramId ni ishlating */
  async findByTelegramId(telegram_id: string): Promise<InstagramAccount | null> {
    return this.findSelectedByTelegramId(telegram_id);
  }

  async findByInstagramAccountId(instagram_account_id: string): Promise<InstagramAccount | null> {
    const active = await this.repo.findOne({
      where: { instagram_account_id, is_active: true },
      order: { updated_at: 'DESC' },
    });
    if (active) return active;
    return this.repo.findOne({
      where: { instagram_account_id },
      order: { updated_at: 'DESC' },
    });
  }

  /**
   * Akkauntni qo'shish yoki yangilash.
   * Agar instagram_account_id boshqa telegram_id ostida allaqachon mavjud bolsa,
   * ownership transfer: barcha bogliq jadvallarda telegram_id yangilanadi.
   */
  async upsertByIgId(
    telegram_id: string,
    instagram_account_id: string,
    data: Partial<InstagramAccount>,
  ): Promise<InstagramAccount> {
    return this.dataSource.transaction(async (manager) => {
      const igRepo = manager.getRepository(InstagramAccount);

      // Bu telegram_id + instagram_account_id kombinatsiyasi mavjudmi?
      let account = await igRepo.findOne({ where: { telegram_id, instagram_account_id } });
      const existingCount = await igRepo.count({ where: { telegram_id, is_active: true } });
      const isFirst = !account && existingCount === 0;

      if (account) {
        // Mavjud — token va ma'lumotlarni yangilaymiz
        Object.assign(account, data, { is_active: true });
      } else {
        // Yangi ulanish — boshqa TG akkauntlar ham ushbu IG ga ulangan bo'lishi mumkin (sharing)
        this.logger.log(
          `Instagram akkaunt ulandi: instagram=${instagram_account_id} telegram=${telegram_id}`,
        );
        account = igRepo.create({
          telegram_id,
          instagram_account_id,
          ...data,
          is_active: true,
          is_selected: isFirst,
        });
      }
      return igRepo.save(account);
    });
  }

  /** @deprecated upsertByIgId ni ishlating */
  async upsert(telegram_id: string, data: Partial<InstagramAccount>): Promise<InstagramAccount> {
    const igId = data.instagram_account_id;
    if (!igId) throw new Error('instagram_account_id talab qilinadi');
    return this.upsertByIgId(telegram_id, igId, data);
  }

  /**
   * Akkauntni tanlash -- transaction ichida atomik tarzda.
   */
  async selectAccount(telegram_id: string, instagram_account_id: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const igRepo = manager.getRepository(InstagramAccount);
      await igRepo.update({ telegram_id }, { is_selected: false });
      await igRepo.update({ telegram_id, instagram_account_id }, { is_selected: true });
    });
  }

  async disconnectAccount(telegram_id: string, instagram_account_id: string): Promise<void> {
    await this.repo.delete({ telegram_id, instagram_account_id });
    const remaining = await this.repo.findOne({ where: { telegram_id, is_active: true } });
    if (remaining) {
      await this.repo.update({ id: remaining.id }, { is_selected: true });
    }
  }

  /** @deprecated disconnectAccount ni ishlating */
  async disconnect(telegram_id: string): Promise<void> {
    const accounts = await this.findAllByTelegramId(telegram_id);
    for (const acc of accounts) {
      await this.disconnectAccount(telegram_id, acc.instagram_account_id);
    }
  }

  async fetchMe(access_token: string): Promise<{
    id: string;
    username: string;
    followers_count?: number;
    media_count?: number;
  }> {
    const res = await axios.get(`${BASE_URL}/me`, {
      params: { fields: 'id,username,followers_count,media_count', access_token },
    });
    return res.data;
  }
}
