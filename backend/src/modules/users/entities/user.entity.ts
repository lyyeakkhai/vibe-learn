import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Progress } from '../../progress/entities/progress.entity';

export type UserRole = 'user' | 'admin';

@Entity('users')
export class User {
  @PrimaryColumn('varchar', { length: 255 })
  id: string; // Clerk User ID (e.g. user_2...)

  @Column('varchar', { length: 255, nullable: true })
  email: string | null;

  @Column('varchar', { length: 255, nullable: true, name: 'full_name' })
  fullName: string | null;

  @Column('varchar', { length: 20, default: 'user' })
  role: 'user' | 'admin';

  @OneToMany(() => Progress, (progress) => progress.user)
  progress: Progress[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
