import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

/**
 * 鐭╅樀鏀剁泭璁板綍琛?- 璁板綍姣忕瑪鏀剁泭鐨勪骇鐢熷拰棰嗗彇
 */
@Entity('matrix_incomes')
export class MatrixIncome {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  /** 鏀剁泭褰掑睘鐢ㄦ埛ID锛堢煩闃甸《鐐癸級 */
  @Column({ name: 'owner_id' })
  ownerId: number;

  /** 鏉ユ簮鐭╅樀ID */
  @Column({ name: 'matrix_id' })
  matrixId: number;

  /** 鏉ユ簮鍧戜綅缂栧彿 */
  @Column({ name: 'slot_number', type: 'tinyint' })
  slotNumber: number;

  /** 璐＄尞鐢ㄦ埛ID锛堝叆浣嶇殑鐢ㄦ埛锛?*/
  @Column({ name: 'from_user_id' })
  fromUserId: number;

  /** 鏀剁泭閲戦 */
  @Column({ name: 'amount', type: 'decimal', precision: 16, scale: 8 })
  amount: number;

  @Column({ name: 'base_fund', type: 'decimal', precision: 16, scale: 8, nullable: true })
  baseFund: number | null;

  @Column({ name: 'reward_rate', type: 'decimal', precision: 10, scale: 6, nullable: true })
  rewardRate: number | null;

  @Column({ name: 'owner_activation_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  ownerActivationAmount: number | null;

  @Column({ name: 'source_activation_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  sourceActivationAmount: number | null;

  /** 鏀剁泭绫诲瀷锛歝laimable=鍙鍙? next_fund=涓嬭疆寮€鍚祫閲?*/
  @Column({ name: 'income_type', type: 'varchar', length: 20 })
  incomeType: string;

  /** 鏄惁宸查鍙栵紙浠卌laimable绫诲瀷鏈夋晥锛?*/
  @Column({ name: 'is_claimed', type: 'boolean', default: false })
  isClaimed: boolean;

  /** 棰嗗彇鏃堕棿 */
  @Column({ name: 'claimed_at', type: 'datetime', nullable: true })
  claimedAt: Date;

  @Column({ name: 'gold_currency_log_id', type: 'bigint', nullable: true })
  goldCurrencyLogId: number | null;

  /** 鎻忚堪 */
  @Column({ name: 'description', type: 'varchar', length: 200, nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
