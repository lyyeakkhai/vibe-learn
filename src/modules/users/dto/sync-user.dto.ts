import { IsOptional, IsString, IsEmail } from 'class-validator';

export class SyncUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  fullName?: string;
}
