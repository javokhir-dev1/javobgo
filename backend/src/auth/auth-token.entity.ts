import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('auth_tokens')
export class AuthToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint' })
  telegram_id: string;

  @Column({ unique: true })
  token: string;

  @Column({ default: false })
  is_used: boolean;

  @Column()
  expires_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
