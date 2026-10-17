import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Course } from './entities/course.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { QueryCoursesDto } from './dto/query-courses.dto';

@Injectable()
export class CoursesRepository {
  constructor(
    @InjectRepository(Course)
    private readonly repo: Repository<Course>,
  ) {}

  async findAll(query: QueryCoursesDto): Promise<Course[]> {
    const qb = this.repo.createQueryBuilder('course');

    if (query.category) {
      qb.andWhere('course.category = :category', { category: query.category });
    }

    if (query.search) {
      qb.andWhere(
        '(course.title ILIKE :search OR course.summary ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy('course.popular', 'DESC').addOrderBy(
      'course.studentCount',
      'DESC',
    );
    return qb.getMany();
  }

  async findBySlug(slug: string): Promise<Course | null> {
    return this.repo
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.modules', 'module')
      .leftJoinAndSelect('module.lessons', 'lesson')
      .where('course.slug = :slug', { slug })
      .orderBy('module.position', 'ASC')
      .addOrderBy('lesson.position', 'ASC')
      .getOne();
  }

  async findById(id: string): Promise<Course | null> {
    return this.repo.findOne({
      where: { id },
      relations: { modules: { lessons: true } },
    });
  }

  async createCourse(dto: CreateCourseDto): Promise<Course> {
    const course = this.repo.create(dto);
    return this.repo.save(course);
  }

  async updateCourse(id: string, dto: UpdateCourseDto): Promise<Course | null> {
    await this.repo.update(id, dto);
    return this.findById(id);
  }

  async deleteCourse(id: string): Promise<boolean> {
    const res = await this.repo.delete(id);
    return (res.affected ?? 0) > 0;
  }
}
