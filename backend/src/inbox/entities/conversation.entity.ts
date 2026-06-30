import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

@Entity('inbox_conversations')
@Index(['instagram_account_id', 'participantIgsid'], { unique: true })
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  instagram_account_id: string;

  @Column()
  participantIgsid: string;

  @Column({ nullable: true })
  igConversationId: string;

  @Column({ default: '' })
  participantUsername: string;

  @Column({ nullable: true })
  participantName: string;

  @Column({ nullable: true })
  participantProfilePic: string;

  @Column({ type: 'text', nullable: true })
  lastMessage: string;

  @Column({ nullable: true, type: 'timestamptz' })
  lastMessageAt: Date;

  @Column({ type: 'bigint', nullable: true })
  lastMessageTimestampMs: string;

  @Column({ default: 0 })
  unreadCount: number;

  @Column({ nullable: true })
  customLabel: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
