import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('withdrawals')
export class Withdrawal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'user_id' })
  @Index()
  userId: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 20, name: 'payment_method', default: 'alipay', comment: 'alipay/bank' })
  paymentMethod: string;

  @Column({ type: 'varchar', length: 50, name: 'account_name', nullable: true, comment: '收款人姓名' })
  accountName: string;

  @Column({ type: 'varchar', length: 50, name: 'account_number', nullable: true, comment: '收款账号（支付宝账号或银行卡号）' })
  accountNumber: string;

  @Column({ type: 'text', nullable: true, comment: '备注信息' })
  content: string;

  @Column({ type: 'tinyint', default: 0, comment: '0待审核 1通过 2驳回' })
  status: number;

  @Column({ type: 'datetime', nullable: true, name: 'review_time' })
  reviewTime: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
