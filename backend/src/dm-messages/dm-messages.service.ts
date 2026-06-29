import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DmMessage } from './entities/dm-message.entity';
import { DmCounter } from './entities/dm-counter.entity';

@Injectable()
export class DmMessagesService {
  constructor(
    @InjectRepository(DmMessage)
    private messageRepo: Repository<DmMessage>,

    @InjectRepository(DmCounter)
    private counterRepo: Repository<DmCounter>,
  ) {}

  async findAll(telegram_id: string, instagram_account_id?: string): Promise<DmMessage[]> {
    if (instagram_account_id) {
      return this.messageRepo.find({ where: { instagram_account_id }, order: { sortOrder: 'ASC' } });
    }
    return this.messageRepo.find({ where: { telegram_id }, order: { sortOrder: 'ASC' } });
  }

  async replaceAll(texts: string[], telegram_id: string, instagram_account_id?: string): Promise<DmMessage[]> {
    if (instagram_account_id) {
      await this.messageRepo.delete({ instagram_account_id });
    } else {
      await this.messageRepo.delete({ telegram_id });
    }
    const entities = texts.map((text, i) =>
      this.messageRepo.create({ text, sortOrder: i, telegram_id, instagram_account_id: instagram_account_id ?? null }),
    );
    await this.messageRepo.save(entities);
    await this.resetCounter(telegram_id, instagram_account_id);
    return this.findAll(telegram_id, instagram_account_id);
  }

  async getNextMessage(telegram_id: string, instagram_account_id?: string): Promise<string | null> {
    const messages = await this.findAll(telegram_id, instagram_account_id);
    if (!messages.length) return null;
    const counter = await this.getCounter(telegram_id, instagram_account_id);
    const index = counter.currentIndex % messages.length;
    const message = messages[index].text;
    counter.currentIndex = (index + 1) % messages.length;
    await this.counterRepo.save(counter);
    return message;
  }

  async getCounter(telegram_id: string, instagram_account_id?: string): Promise<DmCounter> {
    const where: any = instagram_account_id ? { instagram_account_id } : { telegram_id };
    let counter = await this.counterRepo.findOne({ where });
    if (!counter) {
      counter = this.counterRepo.create({ telegram_id, instagram_account_id: instagram_account_id ?? null, currentIndex: 0 });
      await this.counterRepo.save(counter);
    }
    return counter;
  }

  private async resetCounter(telegram_id: string, instagram_account_id?: string) {
    const where: any = instagram_account_id ? { instagram_account_id } : { telegram_id };
    const counter = await this.counterRepo.findOne({ where });
    if (counter) {
      await this.counterRepo.update(counter.id, { currentIndex: 0 });
    }
  }
}
