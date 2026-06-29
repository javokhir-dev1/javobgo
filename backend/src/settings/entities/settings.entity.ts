import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('settings')
export class Settings {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ unique: true })
  instagram_account_id: string;

  @Column({ default: false })
  dmAutoReplyEnabled: boolean;

  // DM rejimi: 'template' | 'ai'
  @Column({ default: 'template' })
  dmMode: string;

  @Column({ nullable: true })
  dmAgentId: number;
}
