import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseModule } from './entities/course-module.entity';
import { CreateCourseModuleDto } from './dto/create-course-module.dto';
import { UpdateCourseModuleDto } from './dto/update-course-module.dto';

@Injectable()
export class CourseModulesRepository {
  constructor(
    @InjectRepository(CourseModule)
    private readonly repo: Repository<CourseModule>,
  ) {}

  async findByCourseId(courseId: string): Promise<CourseModule[]> {
    return this.repo.find({
      where: { courseId },
      order: { position: 'ASC' },
      relations: { lessons: true },
    });
  }

  async findById(id: string): Promise<CourseModule | null> {
    return this.repo.findOne({
      where: { id },
      relations: { lessons: true },
    });
  }

  async createModule(dto: CreateCourseModuleDto): Promise<CourseModule> {
    const mod = this.repo.create(dto);
    return this.repo.save(mod);
  }

  async updateModule(id: string, dto: UpdateCourseModuleDto): Promise<CourseModule | null> {
    await this.repo.update(id, dto);
    return this.findById(id);
  }

  async deleteModule(id: string): Promise<boolean> {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
