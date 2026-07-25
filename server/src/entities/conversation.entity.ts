import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'tinyint', comment: '1单聊 2群聊' })
  type: number;

  @Column({ type: 'varchar', length: 50, nullable: true, comment: '群聊名称（单聊为空）' })
  name: string;

  @Column({ type: 'int', name: 'creator_id' })
  creatorId: number;

  @Column({ type: 'text', nullable: true, comment: '群公告' })
  announcement: string;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '群头像URL' })
  avatar: string;

  @Column({ type: 'tinyint', default: 1, comment: '0待审核 1正常 2拒绝' })
  status: number;

  @Column({ type: 'boolean', default: false, name: 'is_system', comment: '是否系统群（不可解散）' })
  isSystem: boolean;

  @Column({ type: 'boolean', default: false, name: 'all_muted', comment: '是否开启全员禁言' })
  allMuted: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
