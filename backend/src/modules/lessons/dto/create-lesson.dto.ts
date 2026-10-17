import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsInt,
  IsBoolean,
  IsArray,
  Min,
} from 'class-validator';

export class CreateLessonDto {
  @IsUUID()
  @IsNotEmpty()
  moduleId: string;

  @IsUUID()
  @IsNotEmpty()
  courseId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsNotEmpty()
  youtubeVideoId: string;

  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  @IsOptional()
  @IsBoolean()
  freePreview?: boolean;

  @IsOptional()
  @IsArray()
  notes?: Array<Record<string, any>>;

  @IsOptional()
  @IsString()
  notesPlain?: string;

  @IsOptional()
  @IsArray()
  keyPoints?: string[];

  @IsOptional()
  @IsString()
  proTip?: string;

  @IsOptional()
  @IsArray()
  resources?: Array<Record<string, any>>;

  @IsOptional()
  @IsInt()
  @Min(1)
  position?: number;
}
