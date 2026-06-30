import { Controller, Get, Post, Patch, Delete, Param, Body, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { CommentRulesService } from './comment-rules.service';
import { CreateCommentRuleDto } from './dto/create-comment-rule.dto';
import { extractTelegramId } from '../auth/extract-telegram-id';
import { extractActiveIgId } from '../auth/extract-active-ig-id';
import { InstagramAccountsService } from '../instagram-accounts/instagram-accounts.service';

@Controller('api/comment-rules')
export class CommentRulesController {
  constructor(
    private readonly service: CommentRulesService,
    private readonly jwtService: JwtService,
    private readonly igAccounts: InstagramAccountsService,
  ) {}

  private tid(req: Request) { return extractTelegramId(req, this.jwtService); }
  private igId(req: Request) { return extractActiveIgId(req, this.jwtService, this.igAccounts); }

  @Get()
  async findAll(@Req() req: Request) {
    const rules = await this.service.findAll(this.tid(req), await this.igId(req));
    return { success: true, rules };
  }

  @Post()
  async create(@Req() req: Request, @Body() dto: CreateCommentRuleDto) {
    const rule = await this.service.create(dto, this.tid(req), await this.igId(req));
    return { success: true, rule };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateCommentRuleDto>) {
    const rule = await this.service.update(+id, dto);
    return { success: true, rule };
  }

  @Patch(':id/toggle')
  async toggle(@Param('id') id: string) {
    const rule = await this.service.toggleActive(+id);
    return { success: true, rule };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.service.remove(+id);
    return { success: true };
  }
}
