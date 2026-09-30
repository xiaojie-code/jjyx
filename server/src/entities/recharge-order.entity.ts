import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 充值订单：用户选择收款方式付款后提交信息，管理员核实后发放积分。
 */
@Entity('recharge_orders')
export class RechargeOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'user_id' })
  @Index()
  userId: number;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'real_name',
    comment: '付款人姓名',
  })
  realName: string;

  @Column({ type: 'varchar', length: 20, comment: '充值联系手机号' })
  phone: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    name: 'payment_method',
    comment: '付款方式：qrcode 或 wallet',
  })
  paymentMethod: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'payment_address',
    comment: '用户下单时使用的收款地址快照',
  })
  paymentAddress: string | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    comment: '充值金额（选填）',
  })
  amount: number | null;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    name: 'package_name',
    comment: '套餐/档位（选填）',
  })
  packageName: string | null;

  @Column({
    type: 'tinyint',
    default: 0,
    comment: '0待核实 1已处理 2已驳回',
  })
  @Index()
  status: number;

  @Column({
    type: 'varchar',
    length: 200,
    nullable: true,
    name: 'admin_remark',
    comment: '管理员备注',
  })
  adminRemark: string | null;

  @Column({
    type: 'int',
    nullable: true,
    name: 'operator_id',
    comment: '处理的管理员ID',
  })
  operatorId: number | null;

  @Column({ type: 'datetime', nullable: true, name: 'handled_at' })
  handledAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
