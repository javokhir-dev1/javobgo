import { Entity, Column, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('api_quota_configs')
export class ApiQuotaConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 200 })
  maxRequestsPerHour: number;

  @Column({ default: 80 })
  warningThresholdPct: number;

  @Column({ type: 'text', default: '[]' })
  blockedAccounts: string;

  /** Texnik ish rejimi — yoqilganda barcha API so'rovlari bloklandi */
  @Column({ default: false })
  maintenanceMode: boolean;

  @UpdateDateColumn()
  updatedAt: Date;
}
