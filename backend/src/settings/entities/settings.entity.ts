import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('settings')
export class Settings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: false })
  dmAutoReplyEnabled: boolean;

  // DM rejimi: 'template' | 'ai'
  @Column({ default: 'template' })
  dmMode: string;

  @Column({ nullable: true })
  dmAgentId: number;
}
