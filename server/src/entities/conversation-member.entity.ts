import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('conversation_members')
@Index(['conversationId', 'userId'], { unique: true })
export class ConversationMember {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'conversation_id' })
  @Index()
  conversationId: number;

  @Column({ type: 'int', name: 'user_id' })
  @Index()
  userId: number;

  @Column({ type: 'tinyint', default: 1, comment: '1普通成员 2管理员' })
  role: number;

  @Column({ type: 'boolean', default: false, name: 'is_pinned' })
  isPinned: boolean;

  @Column({ type: 'int', default: 0, name: 'unread_count' })
  unreadCount: number;

  @Column({ type: 'boolean', default: false, name: 'is_muted' })
  isMuted: boolean;

  @Column({ type: 'varchar', length: 30, nullable: true, name: 'group_nickname', comment: '我在本群的昵称' })
  groupNickname: string;

  @Column({ type: 'datetime', name: 'joined_at', default: () => 'CURRENT_TIMESTAMP' })
  joinedAt: Date;
}
