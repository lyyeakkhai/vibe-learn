import { Injectable } from '@nestjs/common';
import { ProgressRepository } from './progress.repository';
import { UpsertProgressDto } from './dto/upsert-progress.dto';
import { ToggleCompleteDto } from './dto/toggle-complete.dto';
import { Progress } from './entities/progress.entity';

@Injectable()
export class ProgressService {
  constructor(private readonly progressRepository: ProgressRepository) {}

  async fetchUserProgress(
    userId: string,
    courseId?: string,
  ): Promise<Progress[]> {
    return this.progressRepository.findByUserId(userId, courseId);
  }

  async fetchCompletedLessonIds(
    userId: string,
    courseId?: string,
  ): Promise<string[]> {
    const list = await this.progressRepository.findByUserId(userId, courseId);
    return list.filter((p) => p.isCompleted).map((p) => p.lessonId);
  }

  async upsertProgress(
    userId: string,
    dto: UpsertProgressDto,
  ): Promise<Progress> {
    return this.progressRepository.atomicUpsert(userId, dto);
  }

  async toggleComplete(
    userId: string,
    dto: ToggleCompleteDto,
  ): Promise<Progress> {
    const existing = await this.progressRepository.findByUserAndLesson(
      userId,
      dto.lessonId,
    );
    const newCompletedState =
      dto.isCompleted !== undefined ? dto.isCompleted : !existing?.isCompleted;

    return this.progressRepository.atomicUpsert(userId, {
      courseId: dto.courseId,
      lessonId: dto.lessonId,
      isCompleted: newCompletedState,
      resumeTimestamp: existing?.resumeTimestamp || 0,
    });
  }
}
