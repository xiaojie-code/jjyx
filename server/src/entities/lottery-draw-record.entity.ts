import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('lottery_draw_records')
export class LotteryDrawRecord {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'int', name: 'user_id' })
  @Index()
  userId: number;

  @Column({ type: 'int', name: 'draw_no' })
  drawNo: number;

  @Column({ type: 'int', name: 'prize_level' })
  prizeLevel: number;

  @Column({ type: 'varchar', length: 100, name: 'prize_name' })
  prizeName: string;

  @Column({ type: 'varchar', length: 30, name: 'prize_type' })
  prizeType: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'prize_amount' })
  prizeAmount: number;

  @Column({ type: 'json', nullable: true, name: 'prize_payload' })
  prizePayload: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
