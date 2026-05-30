import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

@Entity('lottery_config')
export class LotteryConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'slot_index' })
  slotIndex: number;

  @Column({ type: 'varchar', length: 50, name: 'prize_name' })
  prizeName: string;

  @Column({ type: 'varchar', length: 20, name: 'prize_type', comment: 'points/gold/item等' })
  prizeType: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'prize_amount' })
  prizeAmount: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, comment: '中奖概率（0-1）' })
  probability: number;

  @Column({ type: 'varchar', length: 20, name: 'cost_type' })
  costType: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'cost_amount' })
  costAmount: number;
}
