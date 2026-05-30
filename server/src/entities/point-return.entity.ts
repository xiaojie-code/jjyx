import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('point_returns')
export class PointReturn {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'user_id' })
  @Index()
  userId: number;

  @Column({ type: 'date', name: 'week_start' })
  weekStart: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'total_consumed' })
  totalConsumed: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'return_total', comment: '应返还总额（消耗×1.5）' })
  returnTotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'returned_amount' })
  returnedAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'daily_return' })
  dailyReturn: number;

  @Column({ type: 'date', name: 'return_start_date', comment: '返还开始日期（下周一）' })
  returnStartDate: string;

  @Column({ type: 'tinyint', default: 0, comment: '0进行中 1已完成' })
  status: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
