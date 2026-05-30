import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('agents')
export class Agent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true, name: 'user_id' })
  userId: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  level: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  remark: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'points_earned' })
  pointsEarned: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'points_consumed' })
  pointsConsumed: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
