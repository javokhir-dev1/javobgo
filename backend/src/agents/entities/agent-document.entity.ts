import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Agent } from './agent.entity';

@Entity('agent_documents')
export class AgentDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  agentId: number;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @Column()
  originalName: string;

  @Column({ type: 'text' })
  content: string;

  @Column()
  fileType: string;

  @Column({ default: 0 })
  fileSize: number;

  @CreateDateColumn()
  createdAt: Date;
}
