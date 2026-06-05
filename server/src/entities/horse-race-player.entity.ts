import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('horse_race_players')
export class HorseRacePlayer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 36, name: 'match_id' })
  @Index()
  matchId: string;

  @Column({ type: 'int', nullable: true, name: 'user_id' })
  @Index()
  userId: number;

  @Column({ type: 'varchar', length: 50, name: 'display_name' })
  displayName: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar: string;

  @Column({ type: 'int', name: 'horse_id' })
  horseId: number;

  @Column({ type: 'varchar', length: 50, name: 'horse_name' })
  horseName: string;

  @Column({ type: 'boolean', default: false, name: 'is_bot' })
  isBot: boolean;

  @Column({ type: 'boolean', default: false })
  confirmed: boolean;

  @Column({ type: 'int', nullable: true })
  placement: number;

  @Column({ type: 'int', nullable: true, name: 'finish_time_ms' })
  finishTimeMs: number;

  @Column({ type: 'boolean', default: false, name: 'is_winner' })
  isWinner: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
