import { IsOptional, IsString, IsEmail, IsIn } from 'class-validator';
import type { UserRole } from '../entities/user.entity';

export class SyncUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsIn(['user', 'admin'])
  role?: UserRole;
}
