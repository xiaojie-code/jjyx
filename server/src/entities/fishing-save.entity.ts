import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('fishing_saves')
@Unique('uniq_fishing_saves_user_game', ['userId', 'gameId'])
export class FishingSave {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'int', name: 'user_id' })
  @Index()
  userId: number;

  @Column({ type: 'int', name: 'game_id' })
  @Index()
  gameId: number;

  @Column({ type: 'json', name: 'save_data' })
  saveData: Record<string, any>;

  @Column({ type: 'varchar', length: 10, nullable: true, name: 'last_daily_reward_date' })
  lastDailyRewardDate: string | null;

  @Column({ type: 'datetime', nullable: true, name: 'level_reset_at' })
  levelResetAt: Date | null;

  @Column({ type: 'varchar', length: 10, nullable: true, name: 'daily_cast_date' })
  dailyCastDate: string | null;

  @Column({ type: 'int', default: 0, name: 'daily_cast_count' })
  dailyCastCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
