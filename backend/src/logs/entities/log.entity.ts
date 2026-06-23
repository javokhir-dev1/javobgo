import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export type LogType = 'success' | 'error' | 'info';

@Entity('logs')
export class Log {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  telegram_id: string;

  @Column({ nullable: true })
  instagram_account_id: string;

  @Column({ default: 'info' })
  type: LogType;

  @Column()
  action: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ nullable: true })
  user: string;

  @Column({ type: 'text', nullable: true })
  userMessage: string;

  @CreateDateColumn()
  createdAt: Date;
}
