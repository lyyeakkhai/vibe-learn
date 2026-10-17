import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { CourseModule } from '../../course-modules/entities/course-module.entity';
import { Lesson } from '../../lessons/entities/lesson.entity';
import { Progress } from '../../progress/entities/progress.entity';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column('varchar', { length: 255, unique: true })
  slug: string;

  @Column('varchar', { length: 255 })
  title: string;

  @Column('text', { nullable: true })
  summary: string | null;

  @Column('varchar', { length: 1024, nullable: true, name: 'cover_image_url' })
  coverImageUrl: string | null;

  @Column('varchar', { length: 100, nullable: true })
  category: string | null;

  @Column('varchar', { length: 255, nullable: true, name: 'instructor_name' })
  instructorName: string | null;

  @Column('text', { nullable: true, name: 'instructor_bio' })
  instructorBio: string | null;

  @Column('varchar', { length: 1024, nullable: true, name: 'instructor_avatar' })
  instructorAvatar: string | null;

  @Column('varchar', { length: 50, nullable: true })
  level: string | null;

  @Column('numeric', { precision: 10, scale: 2, default: 0.0 })
  price: number;

  @Column('boolean', { default: false })
  popular: boolean;

  @Column('integer', { default: 0, name: 'student_count' })
  studentCount: number;

  @Column('jsonb', { nullable: true, name: 'learning_outcomes' })
  learningOutcomes: Array<{
    icon?: string;
    title: string;
    description: string;
  }> | null;

  @OneToMany(() => CourseModule, (mod) => mod.course, { cascade: true })
  modules: CourseModule[];

  @OneToMany(() => Lesson, (lesson) => lesson.course)
  lessons: Lesson[];

  @OneToMany(() => Progress, (progress) => progress.course)
  progress: Progress[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
