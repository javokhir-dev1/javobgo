import {
  Controller, Get, Post, Patch, Body, Param, Query, Req, UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { extractTelegramId } from '../auth/extract-telegram-id';
import { AdminGuard } from '../admin/admin.guard';
import { SupportService } from './support.service';
import { SupportRequestType } from './entities/support-request.entity';

@Controller('api/support')
export class SupportController {
  constructor(
    private readonly jwtService: JwtService,
    private readonly support: SupportService,
  ) {}

  /** Foydalanuvchi murojaat yuboradi (sayt orqali) */
  @Post()
  async create(
    @Req() req: Request,
    @Body() body: { message: string; type?: SupportRequestType },
  ) {
    const telegram_id = extractTelegramId(req, this.jwtService);
    const request = await this.support.create({
      telegram_id,
      message: body.message ?? '',
      type: body.type ?? 'general',
    });
    return { ok: true, id: request.id };
  }

  /** Admin: barcha murojaatlar */
  @Get()
  @UseGuards(AdminGuard)
  async list(@Query('status') status?: 'new' | 'resolved') {
    const requests = await this.support.findAll(status);
    return { ok: true, requests };
  }

  /** Admin: murojaatni hal qilindi deb belgilash */
  @Patch(':id/resolve')
  @UseGuards(AdminGuard)
  async resolve(@Param('id') id: string) {
    const request = await this.support.resolve(+id);
    return { ok: true, request };
  }
}
