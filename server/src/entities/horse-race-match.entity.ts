import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('horse_race_matches')
export class HorseRaceMatch {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ type: 'varchar', length: 20 })
  @Index()
  mode: 'ai' | 'pvp';

  @Column({ type: 'varchar', length: 20, default: 'matching' })
  @Index()
  status: 'matching' | 'confirming' | 'countdown' | 'racing' | 'finished' | 'cancelled';

  @Column({ type: 'int', default: 0, name: 'player_count' })
  playerCount: number;

  @Column({ type: 'int', default: 0, name: 'race_duration_ms' })
  raceDurationMs: number;

  @Column({ type: 'text', nullable: true, name: 'winners_json' })
  winnersJson: string;

  @Column({ type: 'text', nullable: true, name: 'standings_json' })
  standingsJson: string;

  @Column({ type: 'datetime', nullable: true, name: 'started_at' })
  startedAt: Date;

  @Column({ type: 'datetime', nullable: true, name: 'ended_at' })
  endedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
