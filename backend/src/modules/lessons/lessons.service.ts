import { Injectable, NotFoundException } from '@nestjs/common';
import { LessonsRepository } from './lessons.repository';
import { CoursesRepository } from '../courses/courses.repository';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { Lesson } from './entities/lesson.entity';
import { LessonDetailResponse } from './types/lesson.types';

@Injectable()
export class LessonsService {
  constructor(
    private readonly lessonsRepository: LessonsRepository,
    private readonly coursesRepository: CoursesRepository,
  ) {}

  async findByCourseAndSlug(
    courseSlug: string,
    lessonSlug: string,
  ): Promise<LessonDetailResponse> {
    const course = await this.coursesRepository.findBySlug(courseSlug);
    if (!course) {
      throw new NotFoundException(`Course with slug '${courseSlug}' was not found`);
    }

    const lesson = await this.lessonsRepository.findByCourseAndSlug(course.id, lessonSlug);
    if (!lesson) {
      throw new NotFoundException(
        `Lesson with slug '${lessonSlug}' was not found in course '${courseSlug}'`,
      );
    }

    const allOrderedLessons = await this.lessonsRepository.findCourseLessonsOrdered(course.id);
    const currentIndex = allOrderedLessons.findIndex((l) => l.id === lesson.id);

    const prev = currentIndex > 0 ? allOrderedLessons[currentIndex - 1] : null;
    const next =
      currentIndex >= 0 && currentIndex < allOrderedLessons.length - 1
        ? allOrderedLessons[currentIndex + 1]
        : null;

    return {
      lesson,
      previousLesson: prev ? { id: prev.id, slug: prev.slug, title: prev.title } : null,
      nextLesson: next ? { id: next.id, slug: next.slug, title: next.title } : null,
    };
  }

  async findById(id: string): Promise<Lesson> {
    const lesson = await this.lessonsRepository.findById(id);
    if (!lesson) {
      throw new NotFoundException(`Lesson with ID '${id}' was not found`);
    }
    return lesson;
  }

  async create(dto: CreateLessonDto): Promise<Lesson> {
    return this.lessonsRepository.createLesson(dto);
  }

  async update(id: string, dto: UpdateLessonDto): Promise<Lesson> {
    const updated = await this.lessonsRepository.updateLesson(id, dto);
    if (!updated) {
      throw new NotFoundException(`Lesson with ID '${id}' was not found`);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.lessonsRepository.deleteLesson(id);
    if (!deleted) {
      throw new NotFoundException(`Lesson with ID '${id}' was not found`);
    }
  }
}
