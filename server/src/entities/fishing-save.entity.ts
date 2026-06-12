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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
