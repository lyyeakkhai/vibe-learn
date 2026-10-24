import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProgressService } from './progress.service';
import { UpsertProgressDto } from './dto/upsert-progress.dto';
import { ToggleCompleteDto } from './dto/toggle-complete.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async fetchUserProgress(
    @CurrentUser() user: User,
    @Query('courseId') courseId?: string,
  ) {
    return this.progressService.fetchUserProgress(user.id, courseId);
  }

  @Get('completed-ids')
  @HttpCode(HttpStatus.OK)
  async fetchCompletedLessonIds(
    @CurrentUser() user: User,
    @Query('courseId') courseId?: string,
  ) {
    return this.progressService.fetchCompletedLessonIds(user.id, courseId);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async upsertProgress(
    @CurrentUser() user: User,
    @Body() dto: UpsertProgressDto,
  ) {
    return this.progressService.upsertProgress(user.id, dto);
  }

  @Patch('complete')
  @HttpCode(HttpStatus.OK)
  async toggleComplete(
    @CurrentUser() user: User,
    @Body() dto: ToggleCompleteDto,
  ) {
    return this.progressService.toggleComplete(user.id, dto);
  }
}
