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
    if (instagram_account_id) {
      return this.repo.find({ where: { instagram_account_id }, order: { createdAt: 'DESC' } });
    }
    return this.repo.find({ where: { telegram_id }, order: { createdAt: 'DESC' } });
  }

  findActive(telegram_id: string, instagram_account_id?: string) {
    if (instagram_account_id) {
      return this.repo.find({ where: { isActive: true, instagram_account_id } });
    }
    return this.repo.find({ where: { isActive: true, telegram_id } });
  }

  async findOne(id: number, instagram_account_id: string) {
    const a = await this.repo.findOne({ where: { id, instagram_account_id } });
    if (!a) throw new NotFoundException('Avtomatizatsiya topilmadi');
    return a;
  }

  create(dto: CreateAutomationDto, telegram_id: string, instagram_account_id?: string) {
    const a = this.repo.create({ ...dto, telegram_id, instagram_account_id: instagram_account_id ?? null });
    return this.repo.save(a);
  }

  async update(id: number, instagram_account_id: string, dto: Partial<CreateAutomationDto>) {
    await this.findOne(id, instagram_account_id);
    await this.repo.update(id, dto);
    return this.findOne(id, instagram_account_id);
  }

  async toggle(id: number, instagram_account_id: string) {
    const a = await this.findOne(id, instagram_account_id);
    a.isActive = !a.isActive;
    return this.repo.save(a);
  }

  async remove(id: number, instagram_account_id: string) {
    const a = await this.findOne(id, instagram_account_id);
    return this.repo.remove(a);
  }
}
