import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateTodoDto {
  @IsOptional()
  @IsString({ message: 'Title must be a string' })
  title?: string;

  @IsOptional()
  @IsBoolean({ message: 'isCompleted must be a boolean' })
  isCompleted?: boolean;
}
