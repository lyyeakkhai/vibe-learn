import {
  IsUUID,
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class ToggleCompleteDto {
  @IsString()
  @IsNotEmpty()
  courseId: string;

  @IsUUID()
  @IsNotEmpty()
  lessonId: string;

  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}
