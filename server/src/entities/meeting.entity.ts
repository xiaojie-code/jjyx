import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('meetings')
export class Meeting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'group_id' })
  @Index()
  groupId: number;

  @Column({ type: 'int', name: 'creator_id' })
  @Index()
  creatorId: number;

  @Column({ type: 'tinyint', default: 1, comment: '1进行中 2已结束' })
  status: number;

  @Column({ type: 'datetime', name: 'started_at', default: () => 'CURRENT_TIMESTAMP' })
  startedAt: Date;

  @Column({ type: 'datetime', name: 'ended_at', nullable: true })
  endedAt: Date;

  @Column({ type: 'varchar', length: 500, name: 'recording_url', nullable: true })
  recordingUrl: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  title: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}