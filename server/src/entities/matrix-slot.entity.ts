import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

/**
 * 矩阵坑位表 - 记录每个矩阵中6个坑位的占位情况
 */
@Entity('matrix_slots')
export class MatrixSlot {
  @PrimaryGeneratedColumn()
  id: number;

  /** 所属矩阵ID */
  @Column({ name: 'matrix_id' })
  matrixId: number;

  /** 坑位编号（1-6） */
  @Column({ name: 'slot_number', type: 'tinyint' })
  slotNumber: number;

  /** 占位用户ID */
  @Column({ name: 'user_id' })
  userId: number;

  /** 该用户是否为新用户入位（true=新用户首次入位，false=老用户再次入位） */
  @Column({ name: 'is_new_user', type: 'boolean', default: true })
  isNewUser: boolean;

  /** 该坑位产生的收益金额 */
  @Column({ name: 'income_amount', type: 'decimal', precision: 16, scale: 8, default: 0 })
  incomeAmount: number;

  /** 收益类型：claimable=可领取, next_fund=下轮资金, none=无收益 */
  @Column({ name: 'income_type', type: 'varchar', length: 20, default: 'none' })
  incomeType: string;

  /** 该用户入位时的剩余启动资金（用于老用户递推计算） */
  @Column({ name: 'remaining_fund', type: 'decimal', precision: 16, scale: 8, default: 0 })
  remainingFund: number;

  /** 该用户是第几次再次入位上级矩阵（新用户为0，老用户从1开始） */
  @Column({ name: 'reentry_count', default: 0 })
  reentryCount: number;

  /** 是否为矩阵顶点的直推用户（true=直推，false=补位） */
  @Column({ name: 'is_direct', type: 'boolean', default: false })
  isDirect: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
