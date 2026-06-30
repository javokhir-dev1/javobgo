import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('request_window')
export class RequestWindow {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'timestamptz' })
  sentAt: Date;
}
