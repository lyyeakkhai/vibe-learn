import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CoursesRepository } from './courses.repository';
import { Course } from './entities/course.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { QueryCoursesDto } from './dto/query-courses.dto';

@Injectable()
export class CoursesService {
  constructor(private readonly coursesRepository: CoursesRepository) {}

  async findAll(query: QueryCoursesDto): Promise<Course[]> {
    return this.coursesRepository.findAll(query);
  }

  async findBySlug(slug: string): Promise<Course> {
    const course = await this.coursesRepository.findBySlug(slug);
    if (!course) {
      throw new NotFoundException(`Course with slug '${slug}' was not found`);
    }
    return course;
  }

  async findById(id: string): Promise<Course> {
    const course = await this.coursesRepository.findById(id);
    if (!course) {
      throw new NotFoundException(`Course with ID '${id}' was not found`);
    }
    return course;
  }

  async create(dto: CreateCourseDto): Promise<Course> {
    const existing = await this.coursesRepository.findBySlug(dto.slug);
    if (existing) {
      throw new ConflictException(
        `Course with slug '${dto.slug}' already exists`,
      );
    }
    return this.coursesRepository.createCourse(dto);
  }

  async update(id: string, dto: UpdateCourseDto): Promise<Course> {
    if (dto.slug) {
      const existing = await this.coursesRepository.findBySlug(dto.slug);
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Course with slug '${dto.slug}' already exists`,
        );
      }
    }
    const updated = await this.coursesRepository.updateCourse(id, dto);
    if (!updated) {
      throw new NotFoundException(`Course with ID '${id}' was not found`);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.coursesRepository.deleteCourse(id);
    if (!deleted) {
      throw new NotFoundException(`Course with ID '${id}' was not found`);
    }
  }
}
