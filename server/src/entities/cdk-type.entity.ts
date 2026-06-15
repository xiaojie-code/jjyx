import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('cdk_types')
export class CdkType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  description: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'activation_amount',
    comment: '激活档位金额：500或2000',
  })
  activationAmount: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
