import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('automations')
export class Automation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  telegram_id: string;

  @Column({ nullable: true })
  instagram_account_id: string;

  @Column()
  name: string;

  // 'any' = har qanday izoh | 'keyword' = faqat kalit so'zli
  @Column({ default: 'any' })
  triggerType: 'any' | 'keyword';

  @Column({ type: 'simple-json', default: '[]' })
  keywords: string[];

  @Column({ default: true })
  replyEnabled: boolean;

  @Column({ type: 'simple-json', default: '[]' })
  replyTemplates: string[];

  @Column({ default: false })
  dmEnabled: boolean;

  @Column({ type: 'simple-json', default: '[]' })
  dmTemplates: string[];

  // 'all' = barcha postlar | 'specific' = tanlangan postlar
  @Column({ default: 'all' })
  postScope: 'all' | 'specific';

  // postScope === 'specific' bo'lganda qaysi postlar
  @Column({ type: 'simple-json', default: '[]' })
  postIds: string[];

  // UI uchun post ma'lumotlari: [{id, caption, thumbnail}]
  @Column({ type: 'simple-json', default: '[]' })
  postData: { id: string; caption?: string; thumbnail?: string }[];

  @Column({ default: true })
  isActive: boolean;

  // Izohga javob uchun AI agent (ixtiyoriy)
  @Column({ nullable: true, default: null })
  replyAgentId: number | null;

  // DM uchun AI agent (ixtiyoriy)
  @Column({ nullable: true, default: null })
  dmAgentId: number | null;

  // DM global tugmalar (barcha shablonlar va agent javoblari tagida)
  @Column({ type: 'simple-json', default: '[]' })
  dmButtons: { title: string; url: string }[];

  @CreateDateColumn()
  createdAt: Date;
}
