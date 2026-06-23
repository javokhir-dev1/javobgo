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

  async get(): Promise<Settings> {
    let settings = await this.repo.findOne({ where: { id: 1 } });
    if (!settings) {
      settings = this.repo.create({ id: 1 });
      await this.repo.save(settings);
    }
    return settings;
  }

  async update(dto: UpdateSettingsDto): Promise<Settings> {
    await this.get(); // ensure row exists
    await this.repo.update(1, dto as any);
    return this.get();
  }
}
