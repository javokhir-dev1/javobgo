import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('dm_counter')
export class DmCounter {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  telegram_id: string;

  @Column({ nullable: true })
  instagram_account_id: string;

  @Column({ default: 0 })
  currentIndex: number;
}
