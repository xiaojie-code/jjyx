import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('direct_game_reward_records')
export class DirectGameRewardRecord {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', name: 'turnover_id', comment: '关联game_turnover_records.id' })
  @Index()
  turnoverId: number;

  @Column({ type: 'int', name: 'source_user_id', comment: '产生游戏流水的下级用户ID' })
  @Index()
  sourceUserId: number;

  @Column({ type: 'int', name: 'ancestor_user_id', comment: '获得收益的上级/顶点用户ID' })
  @Index()
  ancestorUserId: number;

  @Column({ type: 'tinyint', comment: 'source_user在ancestor_user树里的代数，ancestor为1代，直推为2代' })
  generation: number;

  @Column({ type: 'int', name: 'valid_direct_count', comment: 'ancestor_user当时已激活直推人数快照' })
  validDirectCount: number;

  @Column({ type: 'tinyint', name: 'max_generation', comment: '按有效直推人数计算出的最大可拿代数，最高20代' })
  maxGeneration: number;

  @Column({ type: 'decimal', precision: 18, scale: 6, name: 'turnover_amount', comment: '原始有效游戏流水金额' })
  turnoverAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, name: 'reward_rate', comment: '收益比例，默认0.0015，即千分之1.5' })
  rewardRate: number;

  @Column({ type: 'decimal', precision: 18, scale: 6, name: 'reward_amount', comment: '实际发放到普通积分points的收益' })
  rewardAmount: number;

  @Column({ type: 'bigint', nullable: true, name: 'currency_log_id', comment: '收益发放对应currency_logs.id' })
  @Index()
  currencyLogId: number;

  @Column({ type: 'tinyint', default: 1, comment: '1发放成功 2跳过 3失败' })
  status: number;

  @Column({ type: 'varchar', length: 200, nullable: true, comment: '发放说明或失败原因' })
  remark: string;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;
}
