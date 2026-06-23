import { Controller, Get, Post, Patch, Delete, Param, Body, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { extractTelegramId } from '../auth/extract-telegram-id';
import { extractActiveIgId } from '../auth/extract-active-ig-id';
import { InstagramAccountsService } from '../instagram-accounts/instagram-accounts.service';

@Controller('api/agents')
export class AgentsController {
  constructor(
    private readonly service: AgentsService,
    private readonly jwtService: JwtService,
    private readonly igAccounts: InstagramAccountsService,
  ) {}

  private tid(req: Request) { return extractTelegramId(req, this.jwtService); }
  private igId(req: Request) { return extractActiveIgId(req, this.jwtService, this.igAccounts); }

  @Get()
  async findAll(@Req() req: Request) { return this.service.findAll(this.tid(req), await this.igId(req)); }

  @Get(':id')
  findOne(@Req() req: Request, @Param('id') id: string) {
    return this.service.findOne(+id, this.tid(req));
  }

  @Post()
  async create(@Req() req: Request, @Body() dto: CreateAgentDto) {
    return this.service.create(dto, this.tid(req), await this.igId(req));
  }

  @Patch(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: Partial<CreateAgentDto>) {
    return this.service.update(+id, this.tid(req), dto);
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    return this.service.remove(+id, this.tid(req));
  }

  /* ── Chat history ── */
  @Get(':id/messages')
  getMessages(@Param('id') id: string) {
    return this.service.getMessages(+id);
  }

  @Post(':id/messages')
  saveMessage(
    @Param('id') id: string,
    @Body() body: { role: 'user' | 'model'; text: string },
  ) {
    return this.service.saveMessage(+id, body.role, body.text);
  }

  @Delete(':id/messages')
  clearMessages(@Param('id') id: string) {
    return this.service.clearMessages(+id);
  }

  /* ── AI ── */
  @Post(':id/chat')
  chat(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { messages: { role: 'user' | 'model'; text: string }[] },
  ) {
    return this.service.chat(+id, this.tid(req), body.messages);
  }

  @Post(':id/stream')
  async stream(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { messages: { role: 'user' | 'model'; text: string }[] },
    @Res() res: Response,
  ) {
    const tid = this.tid(req);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();
    try {
      const generator = this.service.chatStream(+id, tid, body.messages);
      for await (const chunk of generator) {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }
    } catch (err) {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    } finally {
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
}
