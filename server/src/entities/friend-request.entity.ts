import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('friend_requests')
export class FriendRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'from_user_id' })
  @Index()
  fromUserId: number;

  @Column({ type: 'int', name: 'to_user_id' })
  @Index()
  toUserId: number;

  @Column({ type: 'tinyint', default: 0, comment: '0待处理 1已同意 2已拒绝' })
  status: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
