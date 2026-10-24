import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTodoDto {
  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  title: string;
}
