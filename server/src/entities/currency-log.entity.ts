import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('currency_logs')
export class CurrencyLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'int', name: 'user_id' })
  @Index()
  userId: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  sn: string;

  @Column({ type: 'varchar', length: 20, name: 'currency_type', comment: 'points/gold/silver/copper/special/reward' })
  currencyType: string;

  @Column({ type: 'decimal', precision: 18, scale: 6, comment: '变动数量（正为收入，负为支出）' })
  amount: number;

  @Column({ type: 'decimal', precision: 18, scale: 6, name: 'before_balance' })
  beforeBalance: number;

  @Column({ type: 'decimal', precision: 18, scale: 6, name: 'after_balance' })
  afterBalance: number;

  @Column({ type: 'varchar', length: 50, name: 'log_type', comment: 'game_earn/game_spend/admin_add/withdraw等' })
  logType: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
