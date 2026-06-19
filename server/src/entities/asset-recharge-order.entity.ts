import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('asset_recharge_orders')
export class AssetRechargeOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'user_id' })
  @Index()
  userId: number;

  @Column({ type: 'varchar', length: 50, name: 'real_name' })
  realName: string;

  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true, name: 'confirmed_amount', comment: '管理员确认到账金额' })
  confirmedAmount: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'referral_code', comment: '充值时填写的推荐码' })
  @Index()
  referralCode: string | null;

  @Column({ type: 'int', nullable: true, name: 'referrer_user_id', comment: '推荐码所属用户ID' })
  @Index()
  referrerUserId: number | null;

  @Column({ type: 'decimal', precision: 18, scale: 6, default: 0, name: 'referral_reward_amount', comment: '推荐收益金额' })
  referralRewardAmount: number;

  @Column({ type: 'int', nullable: true, name: 'referral_reward_record_id', comment: '推荐收益流水ID' })
  referralRewardRecordId: number | null;

  @Column({ type: 'tinyint', default: 0, comment: '0待审核 1已确认 2已驳回' })
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
