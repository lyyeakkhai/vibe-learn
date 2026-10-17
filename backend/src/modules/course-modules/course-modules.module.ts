import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseModulesService } from './course-modules.service';
import { CourseModulesRepository } from './course-modules.repository';
import { CourseModulesController } from './course-modules.controller';
import { CourseModule } from './entities/course-module.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CourseModule])],
  controllers: [CourseModulesController],
  providers: [CourseModulesService, CourseModulesRepository],
  exports: [CourseModulesService, CourseModulesRepository],
})
export class CourseModulesModule {}
