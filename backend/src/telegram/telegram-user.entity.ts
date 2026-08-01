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

  /**
   * Hisob qanday ochilgan. 'telegram' — bot orqali, 'email' — email+parol bilan.
   * Mavjud yozuvlar uchun default 'telegram' bo'lgani sababli migratsiya shart emas.
   */
  @Column({ type: 'varchar', default: 'telegram' })
  auth_type: 'telegram' | 'email';

  /** Faqat auth_type='email' bo'lganda to'ladi. Postgres unique bir nechta NULL ga ruxsat beradi. */
  @Column({ type: 'varchar', nullable: true, unique: true })
  email: string | null;

  /** scrypt hash — password.util.ts ga qarang. Telegram foydalanuvchilarida null. */
  @Column({ type: 'varchar', nullable: true })
  password_hash: string | null;

  @Column({ type: 'varchar', default: 'uz' })
  language: string;

  /** Hisobni o'chirish so'ralgan vaqt (90 kunlik grace period boshlanishi). null = faol */
  @Column({ type: 'timestamp', nullable: true })
  deleted_at: Date | null;

  @CreateDateColumn()
  created_at: Date;
}
