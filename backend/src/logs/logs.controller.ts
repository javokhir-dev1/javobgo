import { Controller, Get, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { LogsService } from './logs.service';
import { extractTelegramId } from '../auth/extract-telegram-id';
import { extractActiveIgId } from '../auth/extract-active-ig-id';
import { InstagramAccountsService } from '../instagram-accounts/instagram-accounts.service';

@Controller('api/logs')
export class LogsController {
  constructor(
    private readonly logsService: LogsService,
    private readonly jwtService: JwtService,
    private readonly igAccounts: InstagramAccountsService,
  ) {}

  private tid(req: Request) { return extractTelegramId(req, this.jwtService); }
  private igId(req: Request) { return extractActiveIgId(req, this.jwtService, this.igAccounts); }

  @Get()
  async findAll(@Req() req: Request, @Query('limit') limit?: string) {
    const logs = await this.logsService.findAll(limit ? +limit : 100, this.tid(req), await this.igId(req));
    return { success: true, logs };
  }

  @Get('today-stats')
  async todayStats(@Req() req: Request) {
    const stats = await this.logsService.todayStats(this.tid(req), await this.igId(req));
    return { success: true, ...stats };
  }
}
