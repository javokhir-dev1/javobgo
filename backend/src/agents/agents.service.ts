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
  private readonly ai: GoogleGenAI;

  constructor(
    @InjectRepository(Agent)
    private repo: Repository<Agent>,
    @InjectRepository(ChatMessage)
    private msgRepo: Repository<ChatMessage>,
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

  async chat(id: number, instagram_account_id: string, messages: MsgInput[]): Promise<string> {
    const agent = await this.findOne(id, instagram_account_id);
    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: { systemInstruction: agent.systemPrompt },
      contents: messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
    });
    return response.text ?? '';
  }

  async *chatStream(id: number, instagram_account_id: string, messages: MsgInput[]): AsyncGenerator<string> {
    const agent = await this.findOne(id, instagram_account_id);
    const history = messages.slice(0, -1).map(m => ({ role: m.role, parts: [{ text: m.text }] }));
    const lastMessage = messages[messages.length - 1].text;
    const chat = this.ai.chats.create({
      model: 'gemini-2.5-flash',
      config: { systemInstruction: agent.systemPrompt },
      history,
    });
    const stream = await chat.sendMessageStream({ message: lastMessage });
    for await (const chunk of stream) {
      if (chunk.text) yield chunk.text;
    }
  }
}
