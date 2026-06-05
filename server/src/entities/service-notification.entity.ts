import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * 服务通知（单向系统提醒，类似微信"服务通知"）
 * 用于：提现申请、建群申请、充值申请等需要管理员关注的系统消息。
 * 仅接收方（一般是 admin）可见，不产生双向聊天记录。
 */
@Entity('service_notifications')
export class ServiceNotification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'recipient_id', comment: '接收方用户ID（通常是管理员）' })
  @Index()
  recipientId: number;

  @Column({ type: 'varchar', length: 30, comment: '类型：withdrawal/group/recharge 等' })
  type: string;

  @Column({ type: 'varchar', length: 100, comment: '通知标题' })
  title: string;

  @Column({ type: 'text', comment: '通知正文' })
  content: string;

  @Column({ type: 'int', nullable: true, name: 'from_user_id', comment: '触发该通知的用户ID' })
  fromUserId: number | null;

  @Column({ type: 'text', nullable: true, name: 'payload_json', comment: '附带业务数据（JSON字符串）' })
  payloadJson: string | null;

  @Column({ type: 'boolean', default: false, name: 'is_read' })
  isRead: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
