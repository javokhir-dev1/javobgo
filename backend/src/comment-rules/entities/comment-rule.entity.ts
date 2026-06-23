import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('comment_rules')
export class CommentRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  telegram_id: string;

  @Column({ nullable: true })
  instagram_account_id: string;

  @Column()
  postId: string;

  @Column({ type: 'text', nullable: true })
  postCaption: string;

  @Column({ nullable: true })
  postThumbnail: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: true })
  replyEnabled: boolean;

  @Column({ type: 'simple-json', default: '[]' })
  replyTemplates: string[];

  @Column({ default: false })
  keywordsEnabled: boolean;

  @Column({ type: 'simple-array', default: '' })
  keywords: string[];

  @Column({ default: false })
  dmEnabled: boolean;

  @Column({ type: 'simple-json', default: '[]' })
  dmTemplates: string[];

  @CreateDateColumn()
  createdAt: Date;
}
