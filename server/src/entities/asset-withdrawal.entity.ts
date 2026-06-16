import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('asset_withdrawals')
export class AssetWithdrawal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'user_id' })
  @Index()
  userId: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, comment: '提现申请金额，含手续费' })
  amount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, comment: '手续费，默认20%' })
  fee: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, name: 'actual_amount', comment: '实际到账金额' })
  actualAmount: number;

  @Column({ type: 'varchar', length: 20, name: 'payment_method', default: 'alipay', comment: 'alipay/bank' })
  paymentMethod: string;

  @Column({ type: 'varchar', length: 50, name: 'account_name' })
  accountName: string;

  @Column({ type: 'varchar', length: 80, name: 'account_number' })
  accountNumber: string;

  @Column({ type: 'decimal', precision: 18, scale: 6, default: 0, name: 'interest_deducted', comment: '审核通过时扣除的利息金额' })
  interestDeducted: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0, name: 'principal_deducted', comment: '审核通过时扣除的本金金额' })
  principalDeducted: number;

  @Column({ type: 'tinyint', default: 0, comment: '0待审核 1已通过 2已驳回' })
  @Index()
  status: number;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'admin_remark' })
  adminRemark: string | null;

  @Column({ type: 'int', nullable: true, name: 'operator_id' })
  operatorId: number | null;

  @Column({ type: 'datetime', nullable: true, name: 'handled_at' })
  handledAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
