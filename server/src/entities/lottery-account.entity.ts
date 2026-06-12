import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('lottery_accounts')
export class LotteryAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'user_id', unique: true })
  userId: number;

  @Column({ type: 'tinyint', default: 0, name: 'activation_chance_granted' })
  activationChanceGranted: number;

  @Column({ type: 'int', default: 0, name: 'team_chance_units' })
  teamChanceUnits: number;

  @Column({ type: 'int', default: 0, name: 'used_chances' })
  usedChances: number;

  @Column({ type: 'int', default: 0, name: 'total_draws' })
  totalDraws: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
