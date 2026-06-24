import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { RateLimit, RateLimitType } from './entities/rate-limit.entity';

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  constructor(
    @InjectRepository(RateLimit)
    private repo: Repository<RateLimit>,
  ) {}

  async canReply(
    userId: string,
    type: RateLimitType,
    cooldownHours = 24,
    perUserLimit = 10,
    mediaId?: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const now = new Date();
    
    const whereClause: any = { userId, type };
    if (mediaId) {
      whereClause.mediaId = mediaId;
    } else if (type === 'comment') {
      // If no mediaId provided for comment but we need it, we can fallback to IsNull or just query global
      whereClause.mediaId = IsNull();
    }

    const record = await this.repo.findOne({ where: whereClause });

    if (record) {
      const userResetAt = record.userResetAt ? new Date(record.userResetAt) : null;
      const isCooldownOver = !userResetAt || now >= userResetAt;
      if (isCooldownOver) return { allowed: true };
      if (record.userReplyCount >= perUserLimit) {
        const remainingMin = Math.ceil((userResetAt.getTime() - now.getTime()) / 60000);
        const remainingHr = (remainingMin / 60).toFixed(1);
        return {
          allowed: false,
          reason: `@${userId} ${perUserLimit} ta javob oldi, ${remainingHr} soatdan keyin davom etadi`,
        };
      }
    }

    return { allowed: true };
  }

  async recordReply(userId: string, type: RateLimitType, cooldownHours = 24, mediaId?: string): Promise<void> {
    const now = new Date();
    const userResetAt = new Date(now.getTime() + cooldownHours * 3_600_000);

    const whereClause: any = { userId, type };
    if (mediaId) {
      whereClause.mediaId = mediaId;
    } else if (type === 'comment') {
      whereClause.mediaId = IsNull();
    }

    let record = await this.repo.findOne({ where: whereClause });

    if (!record) {
      record = this.repo.create({
        userId, type, mediaId,
        lastSentAt: now,
        userReplyCount: 1,
        userResetAt,
        dailyCount: 1,
        dailyResetAt: new Date(),
      });
    } else {
      const isCooldownOver = !record.userResetAt || now >= new Date(record.userResetAt);
      if (isCooldownOver) {
        record.userReplyCount = 1;
        record.userResetAt = userResetAt;
      } else {
        record.userReplyCount += 1;
      }
      record.lastSentAt = now;
    }

    await this.repo.save(record);
  }

  async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async randomDelay(minMs = 5000, maxMs = 10000): Promise<void> {
    const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return this.delay(ms);
  }
}
