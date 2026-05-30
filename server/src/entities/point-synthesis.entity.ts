import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

@Entity('point_synthesis')
export class PointSynthesis {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'consume_points' })
  consumePoints: number;

  @Column({ type: 'varchar', length: 20, name: 'target_currency' })
  targetCurrency: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'target_amount' })
  targetAmount: number;

  @Column({ type: 'tinyint', default: 1, comment: '1启用 0禁用' })
  status: number;
}
