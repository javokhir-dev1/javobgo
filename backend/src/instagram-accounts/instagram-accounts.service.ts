import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InstagramAccount } from './instagram-account.entity';
import axios from 'axios';

const BASE_URL = 'https://graph.instagram.com/v21.0';

@Injectable()
export class InstagramAccountsService {
  constructor(
    @InjectRepository(InstagramAccount)
    private repo: Repository<InstagramAccount>,
  ) {}

  /** Barcha akkauntlar (foydalanuvchi bo'yicha) */
  async findAllByTelegramId(telegram_id: string): Promise<InstagramAccount[]> {
    return this.repo.find({ where: { telegram_id, is_active: true } });
  }

  /** Tanlangan (aktiv) akkaunt */
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
    // Avval aktiv akkauntni qidirish; topilmasa is_active: false bo'lsa ham qaytarish
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

  /** Akkauntni qo'shish yoki yangilash (telegram_id + instagram_account_id bo'yicha) */
  async upsertByIgId(
    telegram_id: string,
    instagram_account_id: string,
    data: Partial<InstagramAccount>,
  ): Promise<InstagramAccount> {
    let account = await this.repo.findOne({ where: { telegram_id, instagram_account_id } });

    // Bu foydalanuvchi uchun birinchi akkauntmi?
    const existingCount = await this.repo.count({ where: { telegram_id, is_active: true } });
    const isFirst = !account && existingCount === 0;

    if (account) {
      Object.assign(account, data, { is_active: true });
    } else {
      account = this.repo.create({
        telegram_id,
        instagram_account_id,
        ...data,
        is_active: true,
        is_selected: isFirst,
      });
    }
    return this.repo.save(account);
  }

  /** @deprecated upsertByIgId ni ishlating */
  async upsert(telegram_id: string, data: Partial<InstagramAccount>): Promise<InstagramAccount> {
    const igId = data.instagram_account_id;
    if (!igId) throw new Error('instagram_account_id talab qilinadi');
    return this.upsertByIgId(telegram_id, igId, data);
  }

  /** Akkauntni tanlash (boshqalarini unselect qilish) */
  async selectAccount(telegram_id: string, instagram_account_id: string): Promise<void> {
    await this.repo.update({ telegram_id }, { is_selected: false });
    await this.repo.update({ telegram_id, instagram_account_id }, { is_selected: true });
  }

  /** Muayyan akkauntni uzish */
  async disconnectAccount(telegram_id: string, instagram_account_id: string): Promise<void> {
    await this.repo.delete({ telegram_id, instagram_account_id });

    // O'chirilgan akkaunt selected bo'lsa — keyingisini tanlash
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

  /**
   * /me endpoint orqali tokenga tegishli haqiqiy akkaunt ID ni olish.
   * Bu Meta webhookdagi entry.id bilan bir xil bo'ladi.
   */
  async fetchMe(access_token: string): Promise<{
    id: string;
    username: string;
    followers_count?: number;
    media_count?: number;
  }> {
    const res = await axios.get(`${BASE_URL}/me`, {
      params: {
        fields: 'id,username,followers_count,media_count',
        access_token,
      },
    });
    return res.data;
  }
}
