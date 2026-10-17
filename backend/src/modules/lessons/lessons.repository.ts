import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from './entities/lesson.entity';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

@Injectable()
export class LessonsRepository {
  constructor(
    @InjectRepository(Lesson)
    private readonly repo: Repository<Lesson>,
  ) {}

  async findById(id: string): Promise<Lesson | null> {
    return this.repo.findOne({
      where: { id },
      relations: { module: true, course: true },
    });
  }

  async findByCourseAndSlug(
    courseId: string,
    slug: string,
  ): Promise<Lesson | null> {
    return this.repo.findOne({
      where: { courseId, slug },
      relations: { module: true, course: true },
    });
  }

  async findCourseLessonsOrdered(courseId: string): Promise<Lesson[]> {
    return this.repo
      .createQueryBuilder('lesson')
      .innerJoin('lesson.module', 'module')
      .where('lesson.courseId = :courseId', { courseId })
      .orderBy('module.position', 'ASC')
      .addOrderBy('lesson.position', 'ASC')
      .getMany();
  }

  async createLesson(dto: CreateLessonDto): Promise<Lesson> {
    const lesson = this.repo.create(dto);
    return this.repo.save(lesson);
  }

  async updateLesson(id: string, dto: UpdateLessonDto): Promise<Lesson | null> {
    await this.repo.update(id, dto);
    return this.findById(id);
  }

  async deleteLesson(id: string): Promise<boolean> {
    const res = await this.repo.delete(id);
    return (res.affected ?? 0) > 0;
  }
}
