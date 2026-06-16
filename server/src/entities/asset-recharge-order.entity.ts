import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('asset_recharge_orders')
export class AssetRechargeOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'user_id' })
  @Index()
  userId: number;

  @Column({ type: 'varchar', length: 50, name: 'real_name' })
  realName: string;

  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true, name: 'confirmed_amount', comment: '管理员确认到账金额' })
  confirmedAmount: number | null;

  @Column({ type: 'tinyint', default: 0, comment: '0待审核 1已确认 2已驳回' })
  @Index()
  status: number;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'admin_remark' })
  adminRemark: string | null;

  @Column({ type: 'int', nullable: true, name: 'operator_id' })
  operatorId: number | null;

  @Column({ type: 'datetime', nullable: true, name: 'handled_at' })
  handledAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
