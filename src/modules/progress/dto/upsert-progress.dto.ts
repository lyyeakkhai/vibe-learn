import { IsUUID, IsNotEmpty, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';

export class UpsertProgressDto {
  @IsUUID()
  @IsNotEmpty()
  courseId: string;

  @IsUUID()
  @IsNotEmpty()
  lessonId: string;

  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  resumeTimestamp?: number;
}
