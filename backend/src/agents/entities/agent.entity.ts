import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('agents')
export class Agent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  telegram_id: string;

  @Column({ nullable: true })
  instagram_account_id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text' })
  systemPrompt: string;

  @Column({ default: '🤖' })
  emoji: string;

  @CreateDateColumn()
  createdAt: Date;
}
