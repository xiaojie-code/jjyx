import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('friendships')
@Index(['userId', 'friendId'], { unique: true })
export class Friendship {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'user_id' })
  @Index()
  userId: number;

  @Column({ type: 'int', name: 'friend_id' })
  friendId: number;

  @Column({ type: 'varchar', length: 50, nullable: true, comment: '备注名（仅自己可见）' })
  remark: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
