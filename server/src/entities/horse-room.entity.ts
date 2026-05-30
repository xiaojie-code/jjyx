import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('horse_rooms')
export class HorseRoom {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'tinyint', default: 1, comment: '1等待中 2进行中 3已结算' })
  status: number;

  @Column({ type: 'int', default: 6, name: 'horse_count' })
  horseCount: number;

  @Column({ type: 'int', nullable: true, name: 'winner_horse' })
  winnerHorse: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'total_pool' })
  totalPool: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true, name: 'settled_at' })
  settledAt: Date;
}
