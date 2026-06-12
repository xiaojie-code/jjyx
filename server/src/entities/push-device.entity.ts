import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('push_devices')
@Index(['vendor', 'deviceToken'], { unique: true })
export class PushDevice {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'int', name: 'user_id' })
  @Index()
  userId: number;

  @Column({ type: 'varchar', length: 20, default: 'android' })
  platform: string;

  @Column({ type: 'varchar', length: 32 })
  @Index()
  vendor: string;

  @Column({ type: 'varchar', length: 512, name: 'device_token' })
  deviceToken: string;

  @Column({ type: 'varchar', length: 128, name: 'device_id', nullable: true })
  deviceId: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  manufacturer: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  model: string | null;

  @Column({ type: 'varchar', length: 32, name: 'app_version', nullable: true })
  appVersion: string | null;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({
    type: 'datetime',
    name: 'last_registered_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  lastRegisteredAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
