import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('request_logs')
export class RequestLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ nullable: true })
  telegram_id: string | null;

  @Index()
  @Column({ nullable: true })
  instagram_account_id: string | null;

  @Column()
  method: string;

  @Column()
  endpoint: string;

  @Column({ default: 0 })
  statusCode: number;

  @Column({ default: 0 })
  durationMs: number;

  @Column({ nullable: true })
  ip: string | null;

  @Index()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
