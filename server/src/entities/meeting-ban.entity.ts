import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('meeting_bans')
@Index(['meetingId', 'userId'], { unique: true })
export class MeetingBan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'meeting_id' })
  @Index()
  meetingId: number;

  @Column({ type: 'int', name: 'user_id' })
  @Index()
  userId: number;

  @Column({ type: 'datetime', name: 'banned_at', default: () => 'CURRENT_TIMESTAMP' })
  bannedAt: Date;
}