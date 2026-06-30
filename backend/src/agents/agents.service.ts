import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { Agent } from './entities/agent.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { AgentDocument } from './entities/agent-document.entity';
import { CreateAgentDto } from './dto/create-agent.dto';

interface MsgInput {
  role: 'user' | 'model';
  text: string;
}

@Injectable()
export class AgentsService {
  private readonly ai: GoogleGenAI;

  constructor(
    @InjectRepository(Agent)
    private repo: Repository<Agent>,
    @InjectRepository(ChatMessage)
    private msgRepo: Repository<ChatMessage>,
    @InjectRepository(AgentDocument)
    private docRepo: Repository<AgentDocument>,
    private config: ConfigService,
  ) {
    this.ai = new GoogleGenAI({ apiKey: this.config.get('GEMINI_API_KEY') });
  }

  findAll(telegram_id: string, instagram_account_id?: string) {
    if (instagram_account_id) {
      return this.repo.find({ where: { instagram_account_id }, order: { createdAt: 'DESC' } });
    }
    return this.repo.find({ where: { telegram_id }, order: { createdAt: 'DESC' } });
  }

  async findOne(id: number, instagram_account_id: string) {
    const agent = await this.repo.findOne({ where: { id, instagram_account_id } });
    if (!agent) throw new NotFoundException('Agent topilmadi');
    return agent;
  }

  create(dto: CreateAgentDto, telegram_id: string, instagram_account_id?: string) {
    return this.repo.save(this.repo.create({ ...dto, telegram_id, instagram_account_id: instagram_account_id ?? null }));
  }

  async update(id: number, instagram_account_id: string, dto: Partial<CreateAgentDto>) {
    await this.findOne(id, instagram_account_id);
    await this.repo.update(id, dto);
    return this.findOne(id, instagram_account_id);
  }

  async remove(id: number, instagram_account_id: string) {
    const agent = await this.findOne(id, instagram_account_id);
    return this.repo.remove(agent);
  }

  async getMessages(agentId: number, instagram_account_id: string) {
    await this.findOne(agentId, instagram_account_id);
    return this.msgRepo.find({ where: { agentId }, order: { createdAt: 'ASC' } });
  }

  async saveMessage(agentId: number, role: 'user' | 'model', text: string) {
    return this.msgRepo.save(this.msgRepo.create({ agentId, role, text }));
  }

  async clearMessages(agentId: number, instagram_account_id: string) {
    await this.findOne(agentId, instagram_account_id);
    await this.msgRepo.delete({ agentId });
    return { success: true };
  }

  // ─── Document helpers ────────────────────────────────────────────────────────

  private async extractText(file: Express.Multer.File): Promise<string> {
    const ext = file.originalname.split('.').pop()?.toLowerCase() ?? '';
    const mime = file.mimetype.toLowerCase();

    try {
      // PDF
      if (mime === 'application/pdf' || ext === 'pdf') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pdfParse = require('pdf-parse');
        const result = await pdfParse(file.buffer);
        return result.text ?? '';
      }

      // DOCX
      if (
        mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        ext === 'docx'
      ) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        return result.value ?? '';
      }

      // XLSX / XLS
      if (
        mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mime === 'application/vnd.ms-excel' ||
        ext === 'xlsx' ||
        ext === 'xls'
      ) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const XLSX = require('xlsx');
        const wb = XLSX.read(file.buffer, { type: 'buffer' });
        const lines: string[] = [];
        for (const sheetName of wb.SheetNames) {
          lines.push(`=== ${sheetName} ===`);
          const sheet = wb.Sheets[sheetName];
          lines.push(XLSX.utils.sheet_to_csv(sheet));
        }
        return lines.join('\n');
      }

      // PPTX — extract slide text via XML
      if (
        mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
        ext === 'pptx'
      ) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const AdmZip = require('adm-zip');
        const zip = new AdmZip(file.buffer);
        const entries = zip.getEntries().filter((e: any) =>
          e.entryName.match(/^ppt\/slides\/slide\d+\.xml$/),
        );
        const texts: string[] = [];
        for (const entry of entries) {
          const xml: string = entry.getData().toString('utf8');
          const matches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) ?? [];
          texts.push(matches.map((m: string) => m.replace(/<[^>]+>/g, '')).join(' '));
        }
        return texts.join('\n');
      }

      // TXT / CSV / MD — plain text
      return file.buffer.toString('utf8');
    } catch (err) {
      return `[Matn ajratib bo'lmadi: ${(err as Error).message}]`;
    }
  }

  async uploadDocument(
    agentId: number,
    instagram_account_id: string,
    file: Express.Multer.File,
  ): Promise<AgentDocument> {
    await this.findOne(agentId, instagram_account_id);
    const content = await this.extractText(file);
    const ext = file.originalname.split('.').pop()?.toLowerCase() ?? 'txt';
    return this.docRepo.save(
      this.docRepo.create({
        agentId,
        originalName: file.originalname,
        content,
        fileType: ext,
        fileSize: file.size,
      }),
    );
  }

  async getDocuments(agentId: number, instagram_account_id: string): Promise<AgentDocument[]> {
    await this.findOne(agentId, instagram_account_id);
    return this.docRepo.find({
      where: { agentId },
      select: ['id', 'originalName', 'fileType', 'fileSize', 'createdAt'],
      order: { createdAt: 'DESC' },
    });
  }

  async deleteDocument(
    agentId: number,
    docId: number,
    instagram_account_id: string,
  ): Promise<{ success: boolean }> {
    await this.findOne(agentId, instagram_account_id);
    await this.docRepo.delete({ id: docId, agentId });
    return { success: true };
  }

  // ─── Build system prompt with injected documents ─────────────────────────

  private async buildSystemPrompt(agentId: number, basePrompt: string): Promise<string> {
    const docs = await this.docRepo.find({ where: { agentId }, order: { createdAt: 'ASC' } });
    if (!docs.length) return basePrompt;

    const docBlock = docs
      .map(d => `=== ${d.originalName} ===\n${d.content}`)
      .join('\n\n');

    return `${basePrompt}\n\n---\n[BILIM BAZASI - quyidagi hujjatlar asosida javob ber]\n\n${docBlock}\n---`;
  }

  // ─── Chat ────────────────────────────────────────────────────────────────────

  async chat(id: number, instagram_account_id: string, messages: MsgInput[]): Promise<string> {
    const agent = await this.findOne(id, instagram_account_id);
    const systemInstruction = await this.buildSystemPrompt(id, agent.systemPrompt);
    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: { systemInstruction },
      contents: messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
    });
    return response.text ?? '';
  }

  async *chatStream(id: number, instagram_account_id: string, messages: MsgInput[]): AsyncGenerator<string> {
    const agent = await this.findOne(id, instagram_account_id);
    const systemInstruction = await this.buildSystemPrompt(id, agent.systemPrompt);
    const history = messages.slice(0, -1).map(m => ({ role: m.role, parts: [{ text: m.text }] }));
    const lastMessage = messages[messages.length - 1].text;
    const chat = this.ai.chats.create({
      model: 'gemini-2.5-flash',
      config: { systemInstruction },
      history,
    });
    const stream = await chat.sendMessageStream({ message: lastMessage });
    for await (const chunk of stream) {
      if (chunk.text) yield chunk.text;
    }
  }
}
