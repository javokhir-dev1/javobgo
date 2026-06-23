import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { Agent } from './entities/agent.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { CreateAgentDto } from './dto/create-agent.dto';

interface MsgInput {
  role: 'user' | 'model';
  text: string;
}

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(Agent)
    private repo: Repository<Agent>,
    @InjectRepository(ChatMessage)
    private msgRepo: Repository<ChatMessage>,
    private config: ConfigService,
  ) {}

  findAll(telegram_id: string, instagram_account_id?: string) {
    const where: any = { telegram_id };
    if (instagram_account_id) where.instagram_account_id = instagram_account_id;
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(id: number, telegram_id: string) {
    const agent = await this.repo.findOne({ where: { id, telegram_id } });
    if (!agent) throw new NotFoundException('Agent topilmadi');
    return agent;
  }

  create(dto: CreateAgentDto, telegram_id: string, instagram_account_id?: string) {
    return this.repo.save(this.repo.create({ ...dto, telegram_id, instagram_account_id: instagram_account_id ?? null }));
  }

  async update(id: number, telegram_id: string, dto: Partial<CreateAgentDto>) {
    await this.findOne(id, telegram_id);
    await this.repo.update(id, dto);
    return this.findOne(id, telegram_id);
  }

  async remove(id: number, telegram_id: string) {
    const agent = await this.findOne(id, telegram_id);
    return this.repo.remove(agent);
  }

  /* ── Chat history ── */
  getMessages(agentId: number) {
    return this.msgRepo.find({
      where: { agentId },
      order: { createdAt: 'ASC' },
    });
  }

  saveMessage(agentId: number, role: 'user' | 'model', text: string) {
    return this.msgRepo.save(this.msgRepo.create({ agentId, role, text }));
  }

  async clearMessages(agentId: number) {
    await this.msgRepo.delete({ agentId });
    return { success: true };
  }

  /* ── AI ── */
  async chat(id: number, telegram_id: string, messages: MsgInput[]): Promise<string> {
    const agent = await this.findOne(id, telegram_id);
    const ai = new GoogleGenAI({ apiKey: this.config.get('GEMINI_API_KEY') });
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      config: { systemInstruction: agent.systemPrompt },
      contents: messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
    });
    return response.text ?? '';
  }

  async *chatStream(id: number, telegram_id: string, messages: MsgInput[]): AsyncGenerator<string> {
    const agent = await this.findOne(id, telegram_id);
    const ai = new GoogleGenAI({ apiKey: this.config.get('GEMINI_API_KEY') });
    const history = messages.slice(0, -1).map(m => ({ role: m.role, parts: [{ text: m.text }] }));
    const lastMessage = messages[messages.length - 1].text;
    const chat = ai.chats.create({
      model: 'gemini-3.5-flash',
      config: { systemInstruction: agent.systemPrompt },
      history,
    });
    const stream = await chat.sendMessageStream({ message: lastMessage });
    for await (const chunk of stream) {
      if (chunk.text) yield chunk.text;
    }
  }
}
