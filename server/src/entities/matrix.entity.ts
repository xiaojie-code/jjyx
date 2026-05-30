import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 矩阵�?- 记录每个用户的每一轮矩�?
 */
@Entity('matrices')
export class Matrix {
  @PrimaryGeneratedColumn()
  id: number;

  /** 矩阵顶点用户ID */
  @Column({ name: 'owner_id' })
  ownerId: number;

  /** 第几轮矩阵（�?开始） */
  @Column({ name: 'round', default: 1 })
  round: number;

  /** 矩阵状态：1进行�?2已完成（出局�?*/
  @Column({ name: 'status', type: 'tinyint', default: 1 })
  status: number;

  /** 当前已填充的坑位数（0-6�?*/
  @Column({ name: 'filled_count', default: 0 })
  filledCount: number;

  /** 本轮可领取收益（位置1-4新用户产生） */
  @Column({ name: 'claimable_income', type: 'decimal', precision: 16, scale: 8, default: 0 })
  claimableIncome: number;

  /** 本轮下轮开启资金（位置5-6产生�?*/
  @Column({ name: 'next_round_fund', type: 'decimal', precision: 16, scale: 8, default: 0 })
  nextRoundFund: number;

  /** 本轮启动资金（第1轮为0，后续轮为上一�?-6号位产生的资金） */
  @Column({ name: 'start_fund', type: 'decimal', precision: 16, scale: 8, default: 0 })
  startFund: number;

  /** 出局时间 */
  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
