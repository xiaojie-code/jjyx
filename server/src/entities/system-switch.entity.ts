import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('system_switches')
export class SystemSwitch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true, name: 'feature_key', comment: 'login/register/game_battle/game_horse等' })
  featureKey: string;

  @Column({ type: 'varchar', length: 50, name: 'feature_name' })
  featureName: string;

  @Column({ type: 'tinyint', default: 1, comment: '1正常 0禁用' })
  status: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
