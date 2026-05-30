import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('horse_bets')
export class HorseBet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'room_id' })
  @Index()
  roomId: number;

  @Column({ type: 'int', name: 'user_id' })
  @Index()
  userId: number;

  @Column({ type: 'int', name: 'horse_number' })
  horseNumber: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'bet_amount' })
  betAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'reward_amount' })
  rewardAmount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
