import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_currencies')
export class UserCurrency {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true, name: 'user_id' })
  userId: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  points: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  gold: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  silver: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'special_points_tier1' })
  specialPointsTier1: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'special_points_tier2' })
  specialPointsTier2: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'special_points_tier3' })
  specialPointsTier3: number;

  @Column({ type: 'tinyint', default: 0, name: 'special_points_count', comment: '已发放特殊积分次数（最多3）' })
  specialPointsCount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'reward_points' })
  rewardPoints: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'invite_points', comment: '邀请积分' })
  invitePoints: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
