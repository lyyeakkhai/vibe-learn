import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Progress } from '../../progress/entities/progress.entity';
import { Todo } from '../../todos/entities/todo.entity';

export type UserRole = 'user' | 'admin';

@Entity('users')
export class User {
  @PrimaryColumn('varchar', { length: 255 })
  id: string; // User ID

  @Index('idx_users_email', { unique: true })
  @Column('varchar', { length: 255, unique: true, nullable: false })
  email: string;

  @Column('varchar', {
    length: 255,
    nullable: true,
    select: false,
    name: 'password_hash',
  })
  passwordHash: string | null;

  @Column('varchar', {
    length: 255,
    nullable: true,
    select: false,
    name: 'hashed_refresh_token',
  })
  hashedRefreshToken: string | null;

  @Column('varchar', { length: 255, nullable: true, name: 'full_name' })
  fullName: string | null;

  @Column('varchar', { length: 20, default: 'user' })
  role: 'user' | 'admin';

  @OneToMany(() => Progress, (progress) => progress.user)
  progress: Progress[];

  @OneToMany(() => Todo, (todo) => todo.owner)
  todos: Todo[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
