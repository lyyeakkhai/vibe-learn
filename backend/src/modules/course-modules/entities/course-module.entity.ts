import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Course } from '../../courses/entities/course.entity';
import { Lesson } from '../../lessons/entities/lesson.entity';

@Entity('modules')
@Index('idx_modules_course_position', ['courseId', 'position'])
export class CourseModule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'course_id' })
  courseId: string;

  @Column('varchar', { length: 255 })
  title: string;

  @Column('text', { nullable: true })
  summary: string | null;

  @Column('integer', { default: 1 })
  position: number;

  @ManyToOne(() => Course, (course) => course.modules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @OneToMany(() => Lesson, (lesson) => lesson.module, { cascade: true })
  lessons: Lesson[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
