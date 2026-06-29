import { Controller, Get, Post, Patch, Delete, Param, Body, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { AutomationsService } from './automations.service';
import { CreateAutomationDto } from './dto/create-automation.dto';
import { extractTelegramId } from '../auth/extract-telegram-id';
import { extractActiveIgId } from '../auth/extract-active-ig-id';
import { InstagramAccountsService } from '../instagram-accounts/instagram-accounts.service';

@Controller('api/automations')
export class AutomationsController {
  constructor(
    private readonly service: AutomationsService,
    private readonly jwtService: JwtService,
    private readonly igAccounts: InstagramAccountsService,
  ) {}

  private tid(req: Request) { return extractTelegramId(req, this.jwtService); }
  private igId(req: Request) { return extractActiveIgId(req, this.jwtService, this.igAccounts); }

  @Get()
  async findAll(@Req() req: Request) {
    return this.service.findAll(this.tid(req), await this.igId(req));
  }

  @Get(':id')
  async findOne(@Req() req: Request, @Param('id') id: string) {
    return this.service.findOne(+id, await this.igId(req));
  }

  @Post()
  async create(@Req() req: Request, @Body() dto: CreateAutomationDto) {
    return this.service.create(dto, this.tid(req), await this.igId(req));
  }

  @Patch(':id')
  async update(@Req() req: Request, @Param('id') id: string, @Body() dto: Partial<CreateAutomationDto>) {
    return this.service.update(+id, await this.igId(req), dto);
  }

  @Patch(':id/toggle')
  async toggle(@Req() req: Request, @Param('id') id: string) {
    return this.service.toggle(+id, await this.igId(req));
  }

  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string) {
    return this.service.remove(+id, await this.igId(req));
  }
}
