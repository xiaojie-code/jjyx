import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('daily_deductions')
export class DailyDeduction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'user_id' })
  @Index()
  userId: number;

  @Column({ type: 'date', name: 'deduction_date', comment: '扣除日期' })
  deductionDate: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'before_balance', comment: '扣除前余额' })
  beforeBalance: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'deducted_amount', comment: '扣除金额' })
  deductedAmount: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, name: 'deduction_rate', comment: '扣除比例' })
  deductionRate: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
