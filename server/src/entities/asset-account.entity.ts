import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('asset_accounts')
export class AssetAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'user_id' })
  @Index({ unique: true })
  userId: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0, name: 'principal_balance', comment: '资产包本金余额' })
  principalBalance: number;

  @Column({ type: 'decimal', precision: 18, scale: 6, default: 0, name: 'interest_balance', comment: '资产包利息余额' })
  interestBalance: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0, name: 'total_recharged', comment: '累计审核通过充值本金' })
  totalRecharged: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0, name: 'total_withdrawn', comment: '累计提现申请金额，含手续费' })
  totalWithdrawn: number;

  @Column({ type: 'decimal', precision: 18, scale: 6, default: 0, name: 'total_interest', comment: '累计生成利息' })
  totalInterest: number;

  @Column({ type: 'date', nullable: true, name: 'last_interest_date', comment: '最后一次计息日期' })
  lastInterestDate: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
