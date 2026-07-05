import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('telegram_users')
export class TelegramUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint', unique: true })
  telegram_id: string;

  @Column({ type: 'varchar', nullable: true })
  username: string | null;

  @Column()
  first_name: string;

  @Column({ type: 'varchar', nullable: true })
  phone_number: string | null;

  @Column({ type: 'varchar', nullable: true })
  avatar_url: string | null;

  @Column({ type: 'varchar', default: 'user' })
  role: 'user' | 'admin';

  @Column({ type: 'varchar', default: 'uz' })
  language: string;

  /** Hisobni o'chirish so'ralgan vaqt (90 kunlik grace period boshlanishi). null = faol */
  @Column({ type: 'timestamp', nullable: true })
  deleted_at: Date | null;

  @CreateDateColumn()
  created_at: Date;
}
