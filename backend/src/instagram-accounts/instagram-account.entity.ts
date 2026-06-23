import {
  Entity, Column, PrimaryGeneratedColumn,
  CreateDateColumn, UpdateDateColumn, Unique,
} from 'typeorm';

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

  @Column({ nullable: true, type: 'text' })
  access_token: string;

  @Column({ nullable: true })
  app_id: string;

  @Column({ nullable: true })
  app_secret: string;

  @Column({ default: true })
  is_active: boolean;

  /** Foydalanuvchi tanlagan aktiv akkaunt */
  @Column({ default: false })
  is_selected: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
