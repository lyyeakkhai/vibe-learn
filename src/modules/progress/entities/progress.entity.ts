import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';
import { Lesson } from '../../lessons/entities/lesson.entity';

@Entity('progress')
@Unique(['userId', 'lessonId'])
@Index('idx_progress_user_course', ['userId', 'courseId'])
export class Progress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 255, name: 'user_id' })
  userId: string;

  @Column('uuid', { name: 'course_id' })
  courseId: string;

  @Column('uuid', { name: 'lesson_id' })
  lessonId: string;

  @Column('boolean', { default: false, name: 'is_completed' })
  isCompleted: boolean;

  @Column('integer', { default: 0, name: 'resume_timestamp' })
  resumeTimestamp: number; // Playback position in seconds

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.progress, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Course, (course) => course.progress, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @ManyToOne(() => Lesson, (lesson) => lesson.progress, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;
}
