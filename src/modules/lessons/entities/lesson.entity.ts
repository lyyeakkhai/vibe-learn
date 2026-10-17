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
import { CourseModule } from '../../course-modules/entities/course-module.entity';
import { Progress } from '../../progress/entities/progress.entity';

@Entity('lessons')
@Index('idx_lessons_course_slug', ['courseId', 'slug'])
@Index('idx_lessons_module_position', ['moduleId', 'position'])
export class Lesson {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'module_id' })
  moduleId: string;

  @Column('uuid', { name: 'course_id' })
  courseId: string;

  @Column('varchar', { length: 255 })
  title: string;

  @Column('varchar', { length: 255 })
  slug: string;

  @Column('varchar', { length: 100, name: 'youtube_video_id' })
  youtubeVideoId: string;

  @Column('varchar', { length: 1024, nullable: true, name: 'video_url' })
  videoUrl: string | null;

  @Column('integer', { default: 0 })
  duration: number; // Duration in seconds

  @Column('boolean', { default: false, name: 'free_preview' })
  freePreview: boolean;

  @Column('jsonb', { nullable: true })
  notes: Array<Record<string, any>> | null;

  @Column('text', { nullable: true, name: 'notes_plain' })
  notesPlain: string | null;

  @Column('jsonb', { nullable: true, name: 'key_points' })
  keyPoints: string[] | null;

  @Column('text', { nullable: true, name: 'pro_tip' })
  proTip: string | null;

  @Column('jsonb', { nullable: true })
  resources: Array<Record<string, any>> | null;

  @Column('integer', { default: 1 })
  position: number;

  @ManyToOne(() => CourseModule, (mod) => mod.lessons, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'module_id' })
  module: CourseModule;

  @ManyToOne(() => Course, (course) => course.lessons, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @OneToMany(() => Progress, (progress) => progress.lesson)
  progress: Progress[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
