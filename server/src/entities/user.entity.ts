import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  account: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  nickname: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar: string;

  @Column({ type: 'tinyint', default: 1, comment: '1正常 2删除 3禁用' })
  status: number;

  @Column({ type: 'tinyint', default: 1, name: 'user_type', comment: '1普通 2运营' })
  userType: number;

  @Column({ type: 'varchar', length: 20, unique: true, nullable: true, name: 'invite_code' })
  inviteCode: string;

  @Column({ type: 'int', nullable: true, name: 'invited_by' })
  @Index()
  invitedBy: number;

  @Column({ type: 'boolean', default: false, name: 'is_activated' })
  isActivated: boolean;

  @Column({ type: 'int', default: 0 })
  shares: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  remark: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'register_ip' })
  registerIp: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'login_ip' })
  loginIp: string;

  @Column({ type: 'datetime', nullable: true, name: 'register_time' })
  registerTime: Date;

  @Column({ type: 'datetime', nullable: true, name: 'login_time' })
  loginTime: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
