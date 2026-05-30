import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

/**
 * 矩阵收益记录�?- 记录每笔收益的产生和领取
 */
@Entity('matrix_incomes')
export class MatrixIncome {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  /** 收益归属用户ID（矩阵顶点） */
  @Column({ name: 'owner_id' })
  ownerId: number;

  /** 来源矩阵ID */
  @Column({ name: 'matrix_id' })
  matrixId: number;

  /** 来源坑位编号 */
  @Column({ name: 'slot_number', type: 'tinyint' })
  slotNumber: number;

  /** 贡献用户ID（入位的用户�?*/
  @Column({ name: 'from_user_id' })
  fromUserId: number;

  /** 收益金额 */
  @Column({ name: 'amount', type: 'decimal', precision: 16, scale: 8 })
  amount: number;

  /** 收益类型：claimable=可领�? next_fund=下轮开启资�?*/
  @Column({ name: 'income_type', type: 'varchar', length: 20 })
  incomeType: string;

  /** 是否已领取（仅claimable类型有效�?*/
  @Column({ name: 'is_claimed', type: 'boolean', default: false })
  isClaimed: boolean;

  /** 领取时间 */
  @Column({ name: 'claimed_at', type: 'datetime', nullable: true })
  claimedAt: Date;

  /** 描述 */
  @Column({ name: 'description', type: 'varchar', length: 200, nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
