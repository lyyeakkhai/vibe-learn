import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Progress } from './entities/progress.entity';
import { UpsertProgressDto } from './dto/upsert-progress.dto';

@Injectable()
export class ProgressRepository {
  constructor(
    @InjectRepository(Progress)
    private readonly repo: Repository<Progress>,
  ) {}

  async findByUserId(userId: string, courseId?: string): Promise<Progress[]> {
    const qb = this.repo
      .createQueryBuilder('progress')
      .where('progress.user_id = :userId', { userId });

    if (courseId) {
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          courseId,
        );
      if (isUuid) {
        qb.andWhere('progress.course_id = :courseId', { courseId });
      } else {
        qb.leftJoin('progress.course', 'course').andWhere(
          'course.slug = :courseSlug',
          { courseSlug: courseId },
        );
      }
    }

    return qb.orderBy('progress.updated_at', 'DESC').getMany();
  }

  async findByUserAndLesson(
    userId: string,
    lessonId: string,
  ): Promise<Progress | null> {
    return this.repo.findOne({
      where: { userId, lessonId },
    });
  }

  async atomicUpsert(
    userId: string,
    dto: UpsertProgressDto,
  ): Promise<Progress> {
    const isCompleted = dto.isCompleted !== undefined ? dto.isCompleted : false;
    const resumeTimestamp =
      dto.resumeTimestamp !== undefined ? dto.resumeTimestamp : 0;

    await this.repo
      .createQueryBuilder()
      .insert()
      .into(Progress)
      .values({
        userId,
        courseId: dto.courseId,
        lessonId: dto.lessonId,
        isCompleted,
        resumeTimestamp,
      })
      .orUpdate(
        ['is_completed', 'resume_timestamp', 'updated_at'],
        ['user_id', 'lesson_id'],
      )
      .execute();

    const record = await this.findByUserAndLesson(userId, dto.lessonId);
    return record!;
  }
}
