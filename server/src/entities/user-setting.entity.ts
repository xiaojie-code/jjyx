import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('user_settings')
export class UserSetting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true, name: 'user_id' })
  userId: number;

  @Column({ type: 'boolean', default: true, name: 'notification_enabled', comment: '消息提醒总开关' })
  notificationEnabled: boolean;

  @Column({ type: 'boolean', default: true, name: 'notification_sound', comment: '新消息声音提醒' })
  notificationSound: boolean;

  @Column({ type: 'boolean', default: true, name: 'notification_popup', comment: '新消息弹窗提醒（后台时）' })
  notificationPopup: boolean;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
