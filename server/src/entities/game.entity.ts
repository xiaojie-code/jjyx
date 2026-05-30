import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('games')
export class Game {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  icon: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 500, name: 'game_url' })
  gameUrl: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'entry_cost' })
  entryCost: number;

  @Column({ type: 'tinyint', default: 1, comment: '1正常 2维护' })
  status: number;

  @Column({ type: 'int', default: 0, name: 'sort_order' })
  sortOrder: number;

  @Column({ type: 'varchar', length: 20, default: 'landscape', comment: 'portrait竖屏 landscape横屏' })
  orientation: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
