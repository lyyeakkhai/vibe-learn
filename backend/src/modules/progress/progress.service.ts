import { Injectable, NotFoundException } from '@nestjs/common';
import { ProgressRepository } from './progress.repository';
import { CoursesRepository } from '../courses/courses.repository';
import { UpsertProgressDto } from './dto/upsert-progress.dto';
import { ToggleCompleteDto } from './dto/toggle-complete.dto';
import { Progress } from './entities/progress.entity';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class ProgressService {
  constructor(
    private readonly progressRepository: ProgressRepository,
    private readonly coursesRepository: CoursesRepository,
  ) {}

  private async resolveCourseId(courseIdOrSlug: string): Promise<string> {
    if (UUID_REGEX.test(courseIdOrSlug)) {
      return courseIdOrSlug;
    }
    const course = await this.coursesRepository.findBySlug(courseIdOrSlug);
    if (!course) {
      throw new NotFoundException(`Course '${courseIdOrSlug}' was not found`);
    }
    return course.id;
  }

  async fetchUserProgress(
    userId: string,
    courseIdOrSlug?: string,
  ): Promise<Progress[]> {
    if (!courseIdOrSlug) {
      return this.progressRepository.findByUserId(userId);
    }
    if (UUID_REGEX.test(courseIdOrSlug)) {
      return this.progressRepository.findByUserId(userId, courseIdOrSlug);
    }
    const course = await this.coursesRepository.findBySlug(courseIdOrSlug);
    if (!course) {
      return [];
    }
    return this.progressRepository.findByUserId(userId, course.id);
  }

  async fetchCompletedLessonIds(
    userId: string,
    courseIdOrSlug?: string,
  ): Promise<string[]> {
    const list = await this.fetchUserProgress(userId, courseIdOrSlug);
    return list.filter((p) => p.isCompleted).map((p) => p.lessonId);
  }

  async upsertProgress(
    userId: string,
    dto: UpsertProgressDto,
  ): Promise<Progress> {
    const courseId = await this.resolveCourseId(dto.courseId);
    return this.progressRepository.atomicUpsert(userId, {
      ...dto,
      courseId,
    });
  }

  async toggleComplete(
    userId: string,
    dto: ToggleCompleteDto,
  ): Promise<Progress> {
    const courseId = await this.resolveCourseId(dto.courseId);
    const existing = await this.progressRepository.findByUserAndLesson(
      userId,
      dto.lessonId,
    );
    const newCompletedState =
      dto.isCompleted !== undefined ? dto.isCompleted : !existing?.isCompleted;

    return this.progressRepository.atomicUpsert(userId, {
      courseId,
      lessonId: dto.lessonId,
      isCompleted: newCompletedState,
      resumeTimestamp: existing?.resumeTimestamp || 0,
    });
  }
}
