import { Controller, Get, Put, Body, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { DmMessagesService } from './dm-messages.service';
import { UpdateDmMessagesDto } from './dto/update-dm-messages.dto';
import { extractTelegramId } from '../auth/extract-telegram-id';
import { extractActiveIgId } from '../auth/extract-active-ig-id';
import { InstagramAccountsService } from '../instagram-accounts/instagram-accounts.service';

@Controller('api/dm-messages')
export class DmMessagesController {
  constructor(
    private readonly service: DmMessagesService,
    private readonly jwtService: JwtService,
    private readonly igAccounts: InstagramAccountsService,
  ) {}

  private tid(req: Request) { return extractTelegramId(req, this.jwtService); }
  private igId(req: Request) { return extractActiveIgId(req, this.jwtService, this.igAccounts); }

  @Get()
  async findAll(@Req() req: Request) {
    const tid = this.tid(req);
    const igId = await this.igId(req);
    const messages = await this.service.findAll(tid, igId);
    const counter = await this.service.getCounter(tid, igId);
    return {
      success: true,
      messages: messages.map((m) => m.text),
      currentIndex: counter.currentIndex,
    };
  }

  @Put()
  async replaceAll(@Req() req: Request, @Body() dto: UpdateDmMessagesDto) {
    await this.service.replaceAll(dto.messages, this.tid(req), await this.igId(req));
    return { success: true, message: 'DM xabarlar saqlandi' };
  }
}
