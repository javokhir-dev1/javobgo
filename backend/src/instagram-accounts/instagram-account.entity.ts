import {
  Entity, Column, PrimaryGeneratedColumn,
  CreateDateColumn, UpdateDateColumn, Unique,
} from 'typeorm';
import { EncryptedTransformer } from '../common/crypto.util';

@Entity('instagram_accounts')
@Unique(['telegram_id', 'instagram_account_id'])
export class InstagramAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  telegram_id: string;

  @Column({ nullable: true })
  instagram_account_id: string;

  @Column({ nullable: true })
  instagram_username: string;

  @Column({ nullable: true, type: 'text', transformer: EncryptedTransformer })
  access_token: string;

  @Column({ nullable: true })
  app_id: string;

  @Column({ nullable: true, type: 'text', transformer: EncryptedTransformer })
  app_secret: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: false })
  is_selected: boolean;

  /** Token muddati tugash sanasi (Instagram long token ~60 kun) */
  @Column({ nullable: true, type: 'timestamp' })
  token_expires_at: Date | null;

  /** Ushbu akkaunt uchun maxsus soatlik limit (null = global limit ishlatiladi) */
  @Column({ nullabl