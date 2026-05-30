import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('meeting_participants')
@Index(['meetingId', 'userId'], { unique: true })
export class MeetingParticipant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'meeting_id' })
  @Index()
  meetingId: number;

  @Column({ type: 'int', name: 'user_id' })
  @Index()
  userId: number;

  @Column({ type: 'datetime', name: 'joined_at', default: () => 'CURRENT_TIMESTAMP' })
  joinedAt: Date;

  @Column({ type: 'datetime', name: 'left_at', nullable: true })
  leftAt: Date;

  @Column({ type: 'boolean', name: 'is_kicked', default: false })
  isKicked: boolean;
}