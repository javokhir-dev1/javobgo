import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, Index,
} from 'typeorm';

@Entity('inbox_messages')
export class InboxMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  instagram_account_id: string;

  @Index()
  @Column()
  conversationId: number;

  @Column()
  participantIgsid: string;

  @Column({ unique: true, nullable: true })
  igMessageId: string;

  @Column({ default: 'in' })
  direction: 'in' | 'out';

  @Column({ type: 'text', nullable: true })
  messageText: string;

  @Column({ nullable: true, type: 'timestamptz' })
  igCreatedAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
