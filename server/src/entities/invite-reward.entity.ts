import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('invite_rewards')
export class InviteReward {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'int', name: 'inviter_id' })
  @Index()
  inviterId: number;

  @Column({ type: 'int', name: 'invitee_id' })
  @Index()
  inviteeId: number;

  @Column({ type: 'varchar', length: 20, name: 'reward_type' })
  rewardType: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'reward_amount' })
  rewardAmount: number;

  @Column({ type: 'varchar', length: 50, name: 'trigger_type', comment: 'invite_register/invitee_consume' })
  triggerType: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
