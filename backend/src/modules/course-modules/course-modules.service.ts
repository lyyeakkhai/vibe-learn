import { Injectable, NotFoundException } from '@nestjs/common';
import { CourseModulesRepository } from './course-modules.repository';
import { CreateCourseModuleDto } from './dto/create-course-module.dto';
import { UpdateCourseModuleDto } from './dto/update-course-module.dto';
import { CourseModule } from './entities/course-module.entity';

@Injectable()
export class CourseModulesService {
  constructor(
    private readonly courseModulesRepository: CourseModulesRepository,
  ) {}

  async findByCourseId(courseId: string): Promise<CourseModule[]> {
    return this.courseModulesRepository.findByCourseId(courseId);
  }

  async findById(id: string): Promise<CourseModule> {
    const mod = await this.courseModulesRepository.findById(id);
    if (!mod) {
      throw new NotFoundException(`Module with ID '${id}' was not found`);
    }
    return mod;
  }

  async create(dto: CreateCourseModuleDto): Promise<CourseModule> {
    return this.courseModulesRepository.createModule(dto);
  }

  async update(id: string, dto: UpdateCourseModuleDto): Promise<CourseModule> {
    const mod = await this.courseModulesRepository.updateModule(id, dto);
    if (!mod) {
      throw new NotFoundException(`Module with ID '${id}' was not found`);
    }
    return mod;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.courseModulesRepository.deleteModule(id);
    if (!deleted) {
      throw new NotFoundException(`Module with ID '${id}' was not found`);
    }
  }
}
