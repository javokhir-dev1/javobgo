import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, MoreThan } from 'typeorm';
import { RequestLog } from './entities/request-log.entity';
import { ApiQuotaConfig } from './entities/api-quota-config.entity';
import { TelegramUser } from '../telegram/telegram-user.entity';
import { InstagramAccount } from '../instagram-accounts/instagram-account.entity';
import { Log } from '../logs/entities/log.entity';
import { Automation } from '../automations/entities/automation.entity';
import { Agent } from '../agents/entities/agent.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(RequestLog)
    private logRepo: Repository<RequestLog>,
    @InjectRepository(ApiQuotaConfig)
    private configRepo: Repository<ApiQuotaConfig>,
    @InjectRepository(TelegramUser)
    private userRepo: Repository<TelegramUser>,
    @InjectRepository(InstagramAccount)
    private igRepo: Repository<InstagramAccount>,
    @InjectRepository(Log)
    private botLogRepo: Repository<Log>,
    @InjectRepository(Automation)
    private automationRepo: Repository<Automation>,
    @InjectRepository(Agent)
    private agentRepo: Repository<Agent>,
    private dataSource: DataSource,
  ) {}

  // ── Konfiguratsiya ──────────────────────────────────────────────
  async getConfig(): Promise<ApiQuotaConfig> {
    let cfg = await this.configRepo.findOne({ where: {} });
    if (!cfg) {
      cfg = this.configRepo.create({
        maxRequestsPerHour: 200,
        warningThresholdPct: 80,
        blockedAccounts: '[]',
        maintenanceMode: false,
      });
      await this.configRepo.save(cfg);
    }
    return cfg;
  }

  async updateConfig(data: {
    maxRequestsPerHour?: number;
    warningThresholdPct?: number;
    maintenanceMode?: boolean;
    dmLimit?: number;
    commentLimit?: number;
  }): Promise<ApiQuotaConfig> {
    const cfg = await this.getConfig();
    if (data.maxRequestsPerHour !== undefined) cfg.maxRequestsPerHour = data.maxRequestsPerHour;
    if (data.warningThresholdPct !== undefined) cfg.warningThresholdPct = data.warningThresholdPct;
    if (data.maintenanceMode !== undefined) cfg.maintenanceMode = data.maintenanceMode;
    if (data.dmLimit !== undefined) cfg.dmLimit = data.dmLimit;
    if (data.commentLimit !== undefined) cfg.commentLimit = data.commentLimit;
    return this.configRepo.save(cfg);
  }

  async blockAccount(igAccountId: string): Promise<void> {
    const cfg = await this.getConfig();
    const list: string[] = JSON.parse(cfg.blockedAccounts || '[]');
    if (!list.includes(igAccountId)) {
      list.push(igAccountId);
      cfg.blockedAccounts = JSON.stringify(list);
      await this.configRepo.save(cfg);
    }
  }

  async unblockAccount(igAccountId: string): Promise<void> {
    const cfg = await this.getConfig();
    const list: string[] = JSON.parse(cfg.blockedAccounts || '[]');
    cfg.blockedAccounts = JSON.stringify(list.filter(id => id !== igAccountId));
    await this.configRepo.save(cfg);
  }

  /** IG akkaunt uchun maxsus soatlik limit o'rnatish (null = global) */
  async setIgAccountCustomLimit(igAccountId: string, customLimit: number | null): Promise<void> {
    await this.igRepo.update({ instagram_account_id: igAccountId }, { customRateLimit: customLimit });
  }

  // ── Umumiy statistika ──────────────────────────────────────────
  async getOverallStats() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo  = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [totalUsers, totalIgAccounts, totalRequests, requestsLastHour, requestsLastDay] = await Promise.all([
      this.userRepo.count(),
      this.igRepo.count(),
      this.logRepo.count(),
      this.logRepo.count({ where: { createdAt: MoreThan(oneHourAgo) } }),
      this.logRepo.count({ where: { createdAt: MoreThan(oneDayAgo) } }),
    ]);

    const recentLogs = await this.logRepo.find({
      order: { createdAt: 'DESC' },
      take: 1000,
      select: ['durationMs', 'statusCode'],
    });
    const avgLatencyMs = recentLogs.length
      ? Math.round(recentLogs.reduce((s, l) => s + l.durationMs, 0) / recentLogs.length)
      : 0;
    const errorRate = recentLogs.length
      ? Math.round((recentLogs.filter(l => l.statusCode >= 400).length / recentLogs.length) * 100)
      : 0;

    const cfg = await this.getConfig();

    return {
      totalUsers,
      totalIgAccounts,
      totalRequests,
      requestsLastHour,
      requestsLastDay,
      avgLatencyMs,
      errorRate,
      maintenanceMode: cfg.maintenanceMode,
      rateLimitConfig: {
        maxRequestsPerHour: cfg.maxRequestsPerHour,
        warningThresholdPct: cfg.warningThresholdPct,
      },
    };
  }

  /** So'nggi 24 soat bo'yicha soatlik statistika */
  async getHourlyStats(): Promise<{ hour: string; count: number; errors: number; avgMs: number }[]> {
    const rows = await this.dataSource.query(`
      SELECT
        to_char(date_trunc('hour', "createdAt"), 'HH24:00') AS hour_label,
        date_trunc('hour', "createdAt")                     AS hour_ts,
        COUNT(*)::int                                       AS count,
        SUM(CASE WHEN "statusCode" >= 400 THEN 1 ELSE 0 END)::int AS errors,
        ROUND(AVG("durationMs"))::int                       AS avg_ms
      FROM request_logs
      WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
      GROUP BY hour_ts, hour_label
      ORDER BY hour_ts
    `);

    // 24 soatlik bo'sh slotlarni to'ldirish
    const map = new Map<string, { count: number; errors: number; avgMs: number }>();
    for (const r of rows) {
      map.set(r.hour_label, { count: r.count, errors: r.errors, avgMs: r.avg_ms || 0 });
    }

    const result: { hour: string; count: number; errors: number; avgMs: number }[] = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 60 * 60 * 1000);
      const label = d.getHours().toString().padStart(2, '0') + ':00';
      const slot = map.get(label);
      result.push({ hour: label, count: slot?.count ?? 0, errors: slot?.errors ?? 0, avgMs: slot?.avgMs ?? 0 });
    }
    return result;
  }

  // ── Foydalanuvchilar ro'yxati ──────────────────────────────────
  async getUsers(page = 1, limit = 20) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const users = await this.userRepo.find({
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const total = await this.userRepo.count();

    const enriched = await Promise.all(users.map(async (u) => {
      const igAccounts = await this.igRepo.find({ where: { telegram_id: u.telegram_id } });
      const reqLastHour = await this.logRepo.count({
        where: { telegram_id: u.telegram_id, createdAt: MoreThan(oneHourAgo) },
      });
      const reqTotal = await this.logRepo.count({ where: { telegram_id: u.telegram_id } });
      const recentLogs = await this.logRepo.find({
        where: { telegram_id: u.telegram_id },
        order: { createdAt: 'DESC' },
        take: 100,
        select: ['durationMs'],
      });
      const avgLatency = recentLogs.length
        ? Math.round(recentLogs.reduce((s, l) => s + l.durationMs, 0) / recentLogs.length)
        : 0;
      return {
        telegram_id: u.telegram_id,
        first_name: u.first_name,
        username: u.username,
        role: u.role,
        created_at: u.created_at,
        igAccountsCount: igAccounts.length,
        igAccounts: igAccounts.map(ig => ({
          id: ig.instagram_account_id,
          username: ig.instagram_username,
          is_active: ig.is_active,
          is_selected: ig.is_selected,
        })),
        reqLastHour,
        reqTotal,
        avgLatency,
      };
    }));

    return { data: enriched, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Automations ──────────────────────────────────────────────────
  async getAllAutomations() {
    const automations = await this.automationRepo.find({ order: { createdAt: 'DESC' } });
    // Join with telegram_user and igRepo manually if needed, or just return basic info
    const enriched = await Promise.all(automations.map(async (auto) => {
      const ig = auto.instagram_account_id ? await this.igRepo.findOne({ where: { instagram_account_id: auto.instagram_account_id } }) : null;
      return {
        ...auto,
        instagram_username: ig?.instagram_username || null,
      };
    }));
    return enriched;
  }

  // ── Agents ───────────────────────────────────────────────────────
  async getAllAgents() {
    const agents = await this.agentRepo.find({ order: { createdAt: 'DESC' } });
    const enriched = await Promise.all(agents.map(async (agent) => {
      const ig = agent.instagram_account_id ? await this.igRepo.findOne({ where: { instagram_account_id: agent.instagram_account_id } }) : null;
      return {
        ...agent,
        instagram_username: ig?.instagram_username || null,
      };
    }));
    return enriched;
  }

  // ── Rate limit holati (har bir IG akkaunt bo'yicha) ────────────
  async getRateLimitStatus() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const cfg = await this.getConfig();
    const blocked: string[] = JSON.parse(cfg.blockedAccounts || '[]');

    const igAccounts = await this.igRepo.find({ order: { created_at: 'DESC' } });

    const result = await Promise.all(igAccounts.map(async (ig) => {
      const maxPerHour = ig.customRateLimit ?? cfg.maxRequestsPerHour;

      const usedLastHour = await this.botLogRepo.count({
        where: { instagram_account_id: ig.instagram_account_id, createdAt: MoreThan(oneHourAgo), type: 'success' },
      });

      const firstInWindow = await this.botLogRepo.findOne({
        where: { instagram_account_id: ig.instagram_account_id, createdAt: MoreThan(oneHourAgo), type: 'success' },
        order: { createdAt: 'ASC' },
      });
      const resetAt = firstInWindow
        ? new Date(firstInWindow.createdAt.getTime() + 60 * 60 * 1000)
        : null;

      const remaining = Math.max(0, maxPerHour - usedLastHour);
      const usedPct   = Math.round((usedLastHour / maxPerHour) * 100);
      const isBlocked = blocked.includes(ig.instagram_account_id);

      return {
        instagram_account_id: ig.instagram_account_id,
        instagram_username:   ig.instagram_username,
        telegram_id:          ig.telegram_id,
        customRateLimit:      ig.customRateLimit,
        usedLastHour,
        remaining,
        maxPerHour,
        usedPct,
        resetAt,
        isBlocked,
        status: isBlocked ? 'blocked'
          : usedPct >= 100 ? 'exceeded'
          : usedPct >= cfg.warningThresholdPct ? 'warning'
          : 'ok',
      };
    }));

    return result.sort((a, b) => b.usedLastHour - a.usedLastHour);
  }

  // ── Bot Javoblari Limiti tekshiruvi (Webhook uchun) ────────────
  async checkBotReplyLimit(igAccountId: string): Promise<boolean> {
    const cfg = await this.getConfig();
    const blocked: string[] = JSON.parse(cfg.blockedAccounts || '[]');
    if (blocked.includes(igAccountId)) return false; // Bloklangan

    const ig = await this.igRepo.findOne({ where: { instagram_account_id: igAccountId } });
    if (!ig) return false;

    const maxPerHour = ig.customRateLimit ?? cfg.maxRequestsPerHour;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const usedLastHour = await this.botLogRepo.count({
      where: { instagram_account_id: igAccountId, createdAt: MoreThan(oneHourAgo), type: 'success' },
    });

    return usedLastHour < maxPerHour;
  }

  // ── IG Token holati ─────────────────────────────────────────────
  async getIgTokenStatus() {
    const igAccounts = await this.igRepo.find({ order: { created_at: 'DESC' } });
    const now = Date.now();

    return igAccounts.map(ig => {
      // token_expires_at yo'q bo'lsa — updated_at + 60 kun deb hisoblash
      const expiresAt = ig.token_expires_at
        ? new Date(ig.token_expires_at)
        : new Date(ig.updated_at.getTime() + 60 * 24 * 60 * 60 * 1000);

      const daysLeft = Math.ceil((expiresAt.getTime() - now) / (1000 * 60 * 60 * 24));
      const status = daysLeft <= 0 ? 'expired'
        : daysLeft <= 7  ? 'critical'
        : daysLeft <= 14 ? 'warning'
        : 'ok';

      return {
        instagram_account_id: ig.instagram_account_id,
        instagram_username:   ig.instagram_username,
        telegram_id:          ig.telegram_id,
        is_active:            ig.is_active,
        token_expires_at:     expiresAt,
        token_expires_known:  !!ig.token_expires_at,
        daysLeft,
        status,
        updated_at:           ig.updated_at,
      };
    });
  }

  // ── So'rov loglari ─────────────────────────────────────────────
  async getRequestLogs(page = 1, limit = 50, telegramId?: string, igAccountId?: string) {
    const where: any = {};
    if (telegramId)  where.telegram_id = telegramId;
    if (igAccountId) where.instagram_account_id = igAccountId;

    const [data, total] = await this.logRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** CSV eksport uchun barcha loglarni qaytarish (so'nggi 10 000 ta) */
  async exportRequestLogs(telegramId?: string, igAccountId?: string) {
    const where: any = {};
    if (telegramId)  where.telegram_id = telegramId;
    if (igAccountId) where.instagram_account_id = igAccountId;

    return this.logRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 10_000,
    });
  }

  // ── Endpoint statistikasi ──────────────────────────────────────
  async getEndpointStats() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const logs = await this.logRepo.find({
      where: { createdAt: MoreThan(oneDayAgo) },
      select: ['endpoint', 'method', 'durationMs', 'statusCode'],
    });

    const stats: Record<string, { count: number; totalMs: number; errors: number }> = {};
    for (const log of logs) {
      const key = `${log.method} ${log.endpoint}`;
      if (!stats[key]) stats[key] = { count: 0, totalMs: 0, errors: 0 };
      stats[key].count++;
      stats[key].totalMs += log.durationMs;
      if (log.statusCode >= 400) stats[key].errors++;
    }

    return Object.entries(stats)
      .map(([endpoint, s]) => ({
        endpoint,
        count: s.count,
        avgMs: Math.round(s.totalMs / s.count),
        errorRate: Math.round((s.errors / s.count) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }

  // ── Foydalanuvchi rolini o'zgartirish ─────────────────────────
  async setUserRole(telegramId: string, role: 'user' | 'admin'): Promise<void> {
    await this.userRepo.update({ telegram_id: telegramId }, { role });
  }
}
