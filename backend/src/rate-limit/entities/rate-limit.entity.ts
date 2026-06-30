import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

export type RateLimitType = 'comment' | 'dm';

@Entity('rate_limits')
export class RateLimit {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  userId: string;

  @Column()
  type: RateLimitType;

  @Column({ nullable: true })
  mediaId: string;

  @Column({ type: 'timestamptz' })
  lastSentAt: Date;

  // Foydalanuvchiga nechta javob yuborildi (cooldown oralig'ida)
  @Column({ default: 0 })
  userReplyCount: number;

  // userReplyCount ni reset qilish vaqti (cooldownHours o'tgandan keyin)
  @Column({ type: 'timestamptz', nullable: true })
  userResetAt: Date;

  // Kunlik umumiy hisoblagich
  @Column({ default: 0 })
  dailyCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  dailyResetAt: Date;
}
