import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('game_turnover_records')
export class GameTurnoverRecord {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'int', name: 'user_id', comment: '产生有效游戏流水的用户ID' })
  @Index()
  userId: number;

  @Column({ type: 'int', nullable: true, name: 'game_id', comment: '游戏ID，可为空，如赛马旧接口未带gameId时为空' })
  @Index()
  gameId: number;

  @Column({ type: 'varchar', length: 50, name: 'source_type', comment: '有效流水类型：bet下注/revive复活/fish_sell卖鱼等' })
  @Index()
  sourceType: string;

  @Column({ type: 'decimal', precision: 18, scale: 6, name: 'turnover_amount', comment: '有效游戏流水金额，按正数记录' })
  turnoverAmount: number;

  @Column({ type: 'bigint', nullable: true, name: 'currency_log_id', comment: '对应用户本人的积分变动日志ID，便于追账' })
  @Index()
  currencyLogId: number;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'biz_id', comment: '业务ID，如房间ID、对局ID、请求ID' })
  bizId: string;

  @Column({ type: 'varchar', length: 200, nullable: true, comment: '流水说明' })
  description: string;

  @Column({ type: 'tinyint', default: 0, name: 'reward_status', comment: '直推流水奖励处理状态：0未处理 1已处理 2开关关闭跳过' })
  @Index()
  rewardStatus: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true, name: 'reward_rate', comment: '本笔流水使用的返利比例快照，如0.0015' })
  rewardRate: number;

  @Column({ type: 'int', default: 0, name: 'reward_count', comment: '本笔流水实际获得返利的上级人数' })
  rewardCount: number;

  @Column({ type: 'decimal', precision: 18, scale: 6, default: 0, name: 'total_reward_amount', comment: '本笔流水合计发放的普通积分返利' })
  totalRewardAmount: number;

  @Column({ type: 'datetime', nullable: true, name: 'reward_processed_at', comment: '直推流水奖励处理完成时间' })
  rewardProcessedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;
}
