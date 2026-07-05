import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index,
} from 'typeorm';

export type SupportRequestType = 'general' | 'data_deletion';
export type SupportRequestStatus = 'new' | 'resolved';

@Entity('support_requests')
export class SupportRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'varchar' })
  telegram_id: string;

  /** Murojaat egasi haqida qisqa ma'lumot (ism/username) — tez ko'rsatish uchun */
  @Column({ type: 'varchar', nullable: true })
  from_name: string | null;

  @Column({ type: 'varchar', default: 'general' })
  type: SupportRequestType;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', default: 'new' })
  status: SupportRequestStatus;

  @Column({ type: 'timestamp', nullable: true })
  resolved_at: Date | null;

  @CreateDateColumn()
  created_at: Date;
}
