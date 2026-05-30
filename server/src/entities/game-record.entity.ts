import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('game_records')
export class GameRecord {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'int', name: 'user_id' })
  @Index()
  userId: number;

  @Column({ type: 'int', name: 'game_id' })
  @Index()
  gameId: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  result: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'points_earned' })
  pointsEarned: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'points_spent' })
  pointsSpent: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
