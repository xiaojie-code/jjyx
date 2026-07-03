import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_sign_in_records')
@Index('uq_user_sign_in_date', ['userId', 'signDate'], { unique: true })
export class SignInRecord {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'int', name: 'user_id' })
  @Index()
  userId: number;

  @Column({ type: 'date', name: 'sign_date' })
  signDate: string;

  @Column({ type: 'tinyint', name: 'week_day', comment: '1周一 7周日' })
  weekDay: number;

  @Column({ type: 'decimal', precision: 18, scale: 6, default: 0, name: 'points_reward' })
  pointsReward: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'copper_reward' })
  copperReward: number;

  @Column({ type: 'tinyint', default: 0, name: 'is_full_week_reward' })
  isFullWeekReward: number;

  @Column({ type: 'bigint', nullable: true, name: 'points_log_id' })
  pointsLogId: number | null;

  @Column({ type: 'bigint', nullable: true, name: 'copper_log_id' })
  copperLogId: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
