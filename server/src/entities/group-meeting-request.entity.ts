import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('group_meeting_requests')
export class GroupMeetingRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'group_id' })
  @Index()
  groupId: number;

  @Column({ type: 'int', name: 'requester_id' })
  @Index()
  requesterId: number;

  @Column({ type: 'int', name: 'reviewer_id', nullable: true })
  reviewerId: number | null;

  @Column({ type: 'tinyint', default: 0, comment: '0待处理 1同意 2拒绝 3超时拒绝' })
  @Index()
  status: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  title: string;

  @Column({ type: 'datetime', name: 'expires_at' })
  @Index()
  expiresAt: Date;

  @Column({ type: 'datetime', name: 'reviewed_at', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'int', name: 'meeting_id', nullable: true })
  meetingId: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
