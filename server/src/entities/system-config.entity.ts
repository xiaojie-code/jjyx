import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('system_configs')
export class SystemConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true, name: 'config_key' })
  configKey: string;

  @Column({ type: 'varchar', length: 50, name: 'config_name', comment: '配置名称' })
  configName: string;

  @Column({ type: 'varchar', length: 200, name: 'config_value', comment: '配置值' })
  configValue: string;

  @Column({ type: 'varchar', length: 200, default: '', comment: '配置说明' })
  description: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
