import { IsUUID, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class ToggleCompleteDto {
  @IsUUID()
  @IsNotEmpty()
  courseId: string;

  @IsUUID()
  @IsNotEmpty()
  lessonId: string;

  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}
