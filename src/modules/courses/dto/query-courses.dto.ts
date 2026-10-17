import { IsOptional, IsString } from 'class-validator';

export class QueryCoursesDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
