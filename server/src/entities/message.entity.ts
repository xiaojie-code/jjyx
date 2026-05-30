import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'int', name: 'conversation_id' })
  @Index()
  conversationId: number;

  @Column({ type: 'int', name: 'sender_id' })
  @Index()
  senderId: number;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'tinyint',
    name: 'msg_type',
    comment: '1文字 2语音 3系统消息 4图片',
  })
  msgType: number;

  @Column({ type: 'tinyint', default: 1, comment: '1已发送 2已读' })
  status: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
