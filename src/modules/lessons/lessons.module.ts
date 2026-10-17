import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonsService } from './lessons.service';
import { LessonsRepository } from './lessons.repository';
import { LessonsController } from './lessons.controller';
import { Lesson } from './entities/lesson.entity';
import { CoursesModule } from '../courses/courses.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lesson]),
    CoursesModule,
  ],
  controllers: [LessonsController],
  providers: [LessonsService, LessonsRepository],
  exports: [LessonsService, LessonsRepository],
})
export class LessonsModule {}
