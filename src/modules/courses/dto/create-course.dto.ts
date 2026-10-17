import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  Min,
} from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  instructorName?: string;

  @IsOptional()
  @IsString()
  instructorBio?: string;

  @IsOptional()
  @IsString()
  instructorAvatar?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsBoolean()
  popular?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  studentCount?: number;

  @IsOptional()
  @IsArray()
  learningOutcomes?: Array<{
    icon?: string;
    title: string;
    description: string;
  }>;
}
