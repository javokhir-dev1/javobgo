import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settings } from './entities/settings.entity';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Settings)
    private repo: Repository<Settings>,
  ) {}

  async get(instagram_account_id: string): Promise<Settings> {
    let settings = await this.repo.findOne({ where: { instagram_account_id } });
    if (!settings) {
      settings = this.repo.create({ instagram_account_id });
      await this.repo.save(settings);
    }
    return settings;
  }

  async update(instagram_account_id: string, dto: UpdateSettingsDto): Promise<Settings> {
    await this.get(instagram_account_id); // ensure row exists
    await this.repo.update({ instagram_account_id }, dto as any);
    return this.get(instagram_account_id);
  }
}
