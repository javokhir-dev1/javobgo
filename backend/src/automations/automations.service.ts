import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Automation } from './entities/automation.entity';
import { CreateAutomationDto } from './dto/create-automation.dto';

@Injectable()
export class AutomationsService {
  constructor(
    @InjectRepository(Automation)
    private repo: Repository<Automation>,
  ) {}

  findAll(telegram_id: string, instagram_account_id?: string) {
    const where: any = { telegram_id };
    if (instagram_account_id) where.instagram_account_id = instagram_account_id;
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  findActive(telegram_id: string, instagram_account_id?: string) {
    const where: any = { isActive: true, telegram_id };
    if (instagram_account_id) where.instagram_account_id = instagram_account_id;
    return this.repo.find({ where });
  }

  async findOne(id: number, telegram_id: string) {
    const a = await this.repo.findOne({ where: { id, telegram_id } });
    if (!a) throw new NotFoundException('Avtomatizatsiya topilmadi');
    return a;
  }

  create(dto: CreateAutomationDto, telegram_id: string, instagram_account_id?: string) {
    const a = this.repo.create({ ...dto, telegram_id, instagram_account_id: instagram_account_id ?? null });
    return this.repo.save(a);
  }

  async update(id: number, telegram_id: string, dto: Partial<CreateAutomationDto>) {
    await this.findOne(id, telegram_id);
    await this.repo.update(id, dto);
    return this.findOne(id, telegram_id);
  }

  async toggle(id: number, telegram_id: string) {
    const a = await this.findOne(id, telegram_id);
    a.isActive = !a.isActive;
    return this.repo.save(a);
  }

  async remove(id: number, telegram_id: string) {
    const a = await this.findOne(id, telegram_id);
    return this.repo.remove(a);
  }
}
