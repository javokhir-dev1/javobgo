import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, LessThan } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { TelegramUser } from '../telegram/telegram-user.entity';
import { InstagramAccount } from '../instagram-accounts/instagram-account.entity';

const GRACE_PERIOD_DAYS = 90;

@Injectable()
export class AccountDeletionService {
  private readonly logger = new Logger(AccountDeletionService.name);

  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  /**
   * O'chirish so'rovi — hisobni "o'chirilgan" deb belgilaydi (soft delete).
   * 90 kun ichida qayta kirilса tiklanadi, aks holda cron butunlay o'chiradi.
   */
  async requestDeletion(telegram_id: string): Promise<{ purge_at: Date }> {
    const now = new Date();
    await this.dataSource.getRepository(TelegramUser).update(
      { telegram_id },
      { deleted_at: now },
    );
    // Botni to'xtatamiz — grace period davomida hech qanday avtomatik javob berilmaydi
    await this.dataSource.getRepository(InstagramAccount).update(
      { telegram_id },
      { is_active: false },
    );
    const purge_at = new Date(now.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
    this.logger.log(`O'chirish so'raldi: ${telegram_id} (purge: ${purge_at.toISOString()})`);
    return { purge_at };
  }

  /** Grace period ichida hisobni tiklash — ma'lumot va bot ishlashini qaytaradi */
  async cancelDeletion(telegram_id: string): Promise<void> {
    await this.dataSource.getRepository(TelegramUser).update(
      { telegram_id },
      { deleted_at: null },
    );
    await this.dataSource.getRepository(InstagramAccount).update(
      { telegram_id },
      { is_active: true },
    );
    this.logger.log(`O'chirish bekor qilindi: ${telegram_id}`);
  }

  /**
   * Foydalanuvchiga tegishli BARCHA ma'lumotni butunlay o'chiradi.
   * Barcha jadvallar + avatar fayli.
   */
  async purgeUser(telegram_id: string): Promise<void> {
    // Avatar faylini o'chirish (bazadan o'chirishdan oldin yo'lni olamiz)
    const user = await this.dataSource
      .getRepository(TelegramUser)
      .findOne({ where: { telegram_id } });
    const avatarUrl = user?.avatar_url ?? null;

    // Foydalanuvchining Instagram akkaunt ID lari (account-bog'liq jadvallar uchun)
    const igRows: Array<{ instagram_account_id: string }> = await this.dataSource.query(
      `SELECT instagram_account_id FROM instagram_accounts WHERE telegram_id = $1`,
      [telegram_id],
    );
    const igIds = igRows.map((r) => r.instagram_account_id).filter(Boolean);

    // Agent ID lari (agent_documents va chat_messages agentId bo'yicha bog'langan)
    const agentRows: Array<{ id: number }> = await this.dataSource.query(
      `SELECT id FROM agents WHERE telegram_id = $1`,
      [telegram_id],
    );
    const agentIds = agentRows.map((r) => r.id);

    await this.dataSource.transaction(async (m) => {
      // Agentga bog'liq bolalar (hujjat + chat tarixi)
      if (agentIds.length) {
        await m.query(
          `DELETE FROM agent_documents WHERE "agentId" = ANY($1::int[])`,
          [agentIds],
        );
        await m.query(
          `DELETE FROM chat_messages WHERE "agentId" = ANY($1::int[])`,
          [agentIds],
        );
      }

      // instagram_account_id bo'yicha bog'liq jadvallar
      if (igIds.length) {
        for (const table of [
          'inbox_messages',
          'inbox_conversations',
          'dm_counter',
          'rate_limits',
          'settings',
        ]) {
          await m.query(
            `DELETE FROM ${table} WHERE instagram_account_id = ANY($1::text[])`,
            [igIds],
          ).catch(() => { /* jadval bo'lmasligi mumkin — e'tiborsiz */ });
        }
      }

      // telegram_id bo'yicha bog'liq jadvallar
      for (const table of [
        'automations',
        'comment_rules',
        'agents',
        'dm_messages',
        'logs',
        'request_logs',
        'auth_tokens',
        'instagram_accounts',
      ]) {
        await m.query(
          `DELETE FROM ${table} WHERE telegram_id = $1`,
          [telegram_id],
        ).catch(() => { /* e'tiborsiz */ });
      }

      // Support murojaatlari
      await m.query(
        `DELETE FROM support_requests WHERE telegram_id = $1`,
        [telegram_id],
      ).catch(() => {});

      // Nihoyat — foydalanuvchining o'zi
      await m.query(`DELETE FROM telegram_users WHERE telegram_id = $1`, [telegram_id]);
    });

    // Avatar faylini diskdan o'chirish
    if (avatarUrl) {
      try {
        const filename = avatarUrl.split('/').pop();
        if (filename) {
          const dir = process.env.AVATARS_UPLOAD_DIR
            || path.join(__dirname, '..', '..', 'uploads', 'avatars');
          const filePath = path.join(dir, filename);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
      } catch (e: any) {
        this.logger.warn(`Avatar fayl o'chirilmadi: ${e.message}`);
      }
    }

    this.logger.log(`Foydalanuvchi butunlay o'chirildi: ${telegram_id}`);
  }

  /** Cron: grace period tugagan hisoblarni butunlay o'chiradi */
  async purgeExpired(): Promise<void> {
    const cutoff = new Date(Date.now() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
    const expired = await this.dataSource.getRepository(TelegramUser).find({
      where: { deleted_at: LessThan(cutoff) },
    });
    if (!expired.length) {
      this.logger.log('Grace period tugagan hisob topilmadi');
      return;
    }
    this.logger.log(`${expired.length} ta hisob butunlay o'chirilmoqda...`);
    for (const u of expired) {
      try {
        await this.purgeUser(u.telegram_id);
      } catch (e: any) {
        this.logger.error(`Purge xato (${u.telegram_id}): ${e.message}`);
      }
    }
  }
}
