import {
  Controller, Get, Post, Patch, Delete, Param, Body, Req, Res,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { extractTelegramId } from '../auth/extract-telegram-id';
import { extractActiveIgId } from '../auth/extract-active-ig-id';
import { InstagramAccountsService } from '../instagram-accounts/instagram-accounts.service';

const ALLOWED_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'text/markdown',
];

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
  async findAll(@Req() req: Request) {
    return this.service.findAll(this.tid(req), await this.igId(req));
  }

  @Get(':id')
  async findOne(@Req() req: Request, @Param('id') id: string) {
    return this.service.findOne(+id, await this.igId(req));
  }

  @Post()
  async create(@Req() req: Request, @Body() dto: CreateAgentDto) {
    return this.service.create(dto, this.tid(req), await this.igId(req));
  }

  @Patch(':id')
  async update(@Req() req: Request, @Param('id') id: string, @Body() dto: Partial<CreateAgentDto>) {
    return this.service.update(+id, await this.igId(req), dto);
  }

  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string) {
    return this.service.remove(+id, await this.igId(req));
  }

  // ─── Messages ────────────────────────────────────────────────────────────────

  @Get(':id/messages')
  async getMessages(@Req() req: Request, @Param('id') id: string) {
    return this.service.getMessages(+id, await this.igId(req));
  }

  @Post(':id/messages')
  async saveMessage(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { role: 'user' | 'model'; text: string },
  ) {
    this.tid(req);
    return this.service.saveMessage(+id, body.role, body.text);
  }

  @Delete(':id/messages')
  async clearMessages(@Req() req: Request, @Param('id') id: string) {
    return this.service.clearMessages(+id, await this.igId(req));
  }

  // ─── Documents ───────────────────────────────────────────────────────────────

  @Get(':id/documents')
  async getDocuments(@Req() req: Request, @Param('id') id: string) {
    return this.service.getDocuments(+id, await this.igId(req));
  }

  @Post(':id/documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: undefined, // memoryStorage (buffer)
      limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
    }),
  )
  async uploadDocument(
    @Req() req: Request,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Fayl yuklanmadi');
    const ext = file.originalname.split('.').pop()?.toLowerCase() ?? '';
    const allowed = ALLOWED_MIMES.includes(file.mimetype) ||
      ['pdf', 'docx', 'xlsx', 'xls', 'pptx', 'txt', 'csv', 'md'].includes(ext);
    if (!allowed) throw new BadRequestException('Bu fayl turi qo\'llab-quvvatlanmaydi');
    return this.service.uploadDocument(+id, await this.igId(req), file);
  }

  @Delete(':id/documents/:docId')
  async deleteDocument(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('docId') docId: string,
  ) {
    return this.service.deleteDocument(+id, +docId, await this.igId(req));
  }

  // ─── Chat ────────────────────────────────────────────────────────────────────

  @Post(':id/chat')
  async chat(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { messages: { role: 'user' | 'model'; text: string }[] },
  ) {
    return this.service.chat(+id, await this.igId(req), body.messages);
  }

  @Post(':id/stream')
  async stream(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { messages: { role: 'user' | 'model'; text: string }[] },
    @Res() res: Response,
  ) {
    const igId = await this.igId(req);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();
    try {
      const generator = this.service.chatStream(+id, igId, body.messages);
      for await (const chunk of generator) {
        res.write('data: ' + JSON.stringify({ text: chunk }) + '\n\n');
      }
    } catch (err) {
      res.write('data: ' + JSON.stringify({ error: err.message }) + '\n\n');
    } finally {
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
}
