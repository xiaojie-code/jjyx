import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('cdks')
export class Cdk {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'int', name: 'cdk_type_id' })
  @Index()
  cdkTypeId: number;

  @Column({ type: 'json', name: 'items_json', nullable: true, comment: '奖励物品配置 [{"item":"points","amount":100}]' })
  itemsJson: any;

  @Column({ type: 'tinyint', default: 0, comment: '0未使用 1已使用' })
  status: number;

  @Column({ type: 'int', nullable: true, name: 'used_by' })
  usedBy: number;

  @Column({ type: 'datetime', nullable: true, name: 'used_at' })
  usedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
