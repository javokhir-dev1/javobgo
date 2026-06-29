import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommentRule } from './entities/comment-rule.entity';
import { CreateCommentRuleDto } from './dto/create-comment-rule.dto';

@Injectable()
export class CommentRulesService {
  constructor(
    @InjectRepository(CommentRule)
    private repo: Repository<CommentRule>,
  ) {}

  findAll(telegram_id: string, instagram_account_id?: string): Promise<CommentRule[]> {
    if (instagram_account_id) {
      return this.repo.find({ where: { instagram_account_id }, order: { createdAt: 'DESC' } });
    }
    return this.repo.find({ where: { telegram_id }, order: { createdAt: 'DESC' } });
  }

  findByPostId(postId: string, telegram_id: string, instagram_account_id?: string): Promise<CommentRule | null> {
    if (instagram_account_id) {
      return this.repo.findOne({ where: { postId, isActive: true, instagram_account_id } });
    }
    return this.repo.findOne({ where: { postId, isActive: true, telegram_id } });
  }

  findGlobal(telegram_id: string, instagram_account_id?: string): Promise<CommentRule | null> {
    if (instagram_account_id) {
      return this.repo.findOne({ where: { postId: '__global__', isActive: true, instagram_account_id } });
    }
    return this.repo.findOne({ where: { postId: '__global__', isActive: true, telegram_id } });
  }

  create(dto: CreateCommentRuleDto, telegram_id: string, instagram_account_id?: string): Promise<CommentRule> {
    const rule = this.repo.create({
      ...dto,
      telegram_id,
      instagram_account_id: instagram_account_id ?? null,
      keywords: dto.keywords || [],
    });
    return this.repo.save(rule);
  }

  async update(id: number, dto: Partial<CreateCommentRuleDto>): Promise<CommentRule> {
    await this.repo.update(id, dto as any);
    return this.repo.findOne({ where: { id } });
  }

  async remove(id: number): Promise<void> {
    await this.repo.delete(id);
  }

  async toggleActive(id: number): Promise<CommentRule> {
    const rule = await this.repo.findOne({ where: { id } });
    rule.isActive = !rule.isActive;
    return this.repo.save(rule);
  }
}
