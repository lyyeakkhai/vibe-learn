import { Lesson } from '../entities/lesson.entity';

export interface LessonNavigationLink {
  id: string;
  slug: string;
  title: string;
}

export interface LessonDetailResponse {
  lesson: Lesson;
  previousLesson: LessonNavigationLink | null;
  nextLesson: LessonNavigationLink | null;
}
