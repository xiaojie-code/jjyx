import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('asset_referral_reward_records')
@Index('uq_asset_referral_order', ['rechargeOrderId'], { unique: true })
export class AssetReferralRewardRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'referrer_user_id', comment: '获得推荐收益的用户ID' })
  @Index()
  referrerUserId: number;

  @Column({ type: 'int', name: 'recharge_user_id', comment: '充值用户ID' })
  @Index()
  rechargeUserId: number;

  @Column({ type: 'int', name: 'recharge_order_id', comment: '资产包充值订单ID' })
  rechargeOrderId: number;

  @Column({ type: 'varchar', length: 20, name: 'referral_code', comment: '充值时填写的推荐码' })
  @Index()
  referralCode: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, name: 'recharge_amount', comment: '确认到账充值金额' })
  rechargeAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, default: 0.1, name: 'reward_rate', comment: '推荐收益比例' })
  rewardRate: number;

  @Column({ type: 'decimal', precision: 18, scale: 6, name: 'reward_amount', comment: '推荐收益金额' })
  rewardAmount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
