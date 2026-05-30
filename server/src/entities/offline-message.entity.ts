import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('offline_messages')
export class OfflineMessage {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'int', name: 'user_id' })
  @Index()
  userId: number;

  @Column({ type: 'bigint', name: 'message_id' })
  messageId: number;

  @Column({ type: 'boolean', default: false, name: 'is_pushed' })
  isPushed: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
