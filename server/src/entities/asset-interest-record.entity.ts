import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('asset_interest_records')
@Index('uq_asset_interest_user_date', ['userId', 'interestDate'], { unique: true })
export class AssetInterestRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'user_id' })
  userId: number;

  @Column({ type: 'date', name: 'interest_date', comment: '计息日期' })
  interestDate: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, name: 'base_principal', comment: '当日计息本金' })
  basePrincipal: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, name: 'annual_rate', comment: '月利率，默认0.054' })
  annualRate: number;

  @Column({ type: 'decimal', precision: 18, scale: 6, name: 'interest_amount', comment: '当日生成利息' })
  interestAmount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
