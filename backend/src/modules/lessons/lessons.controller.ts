import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller()
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Get('courses/:courseSlug/lessons/:lessonSlug')
  @HttpCode(HttpStatus.OK)
  async findBySlug(
    @Param('courseSlug') courseSlug: string,
    @Param('lessonSlug') lessonSlug: string,
  ) {
    return this.lessonsService.findByCourseAndSlug(courseSlug, lessonSlug);
  }

  @Get('lessons/:id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.lessonsService.findById(id);
  }

  @Post('lessons')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createLessonDto: CreateLessonDto) {
    return this.lessonsService.create(createLessonDto);
  }

  @Patch('lessons/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLessonDto: UpdateLessonDto,
  ) {
    return this.lessonsService.update(id, updateLessonDto);
  }

  @Delete('lessons/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.lessonsService.remove(id);
  }
}
