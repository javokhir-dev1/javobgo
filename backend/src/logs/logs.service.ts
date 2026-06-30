import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Log } from './entities/log.entity';
import { CreateLogDto } from './dto/create-log.dto';

@Injectable()
export class LogsService {
  constructor(
    @InjectRepository(Log)
    private repo: Repository<Log>,
  ) {}

  async create(dto: CreateLogDto & { telegram_id?: string; instagram_account_id?: string }): Promise<Log> {
    const log = this.repo.create(dto);
    return this.repo.save(log);
  }

  async findAll(limit = 100, telegram_id?: string, instagram_account_id?: string): Promise<Log[]> {
    const where: any = {};
    if (telegram_id) where.telegram_id = telegram_id;
    if (instagram_account_id) where.instagram_account_id = instagram_account_id;
    return this.repo.find({
      where: Object.keys(where).length ? where : {},
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async todayStats(telegram_id?: string, instagram_account_id?: string): Promise<{ commentReplies: number; dmUsers: number }> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const baseWhere: any = {};
    if (telegram_id) baseWhere.telegram_id = telegram_id;
    if (instagram_account_id) baseWhere.instagram_account_id = instagram_account_id;

    const [commentReplies, dmLogs] = await Promise.all([
      this.repo.count({
        where: {
          ...baseWhere,
          action: 'Komment Javob',
          type: 'success',
          createdAt: MoreThanOrEqual(todayStart),
        },
      }),
      this.repo.find({
        where: {
          ...baseWhere,
          action: 'DM Avtoreply',
          type: 'success',
          createdAt: MoreThanOrEqual(todayStart),
        },
        select: ['user'],
      }),
    ]);

    const dmUsers = new Set(dmLogs.map(l => l.user).filter(Boolean)).size;

    return { commentReplies, dmUsers };
  }
}
