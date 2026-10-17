import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersRepository } from './users.repository';
import { User, UserRole } from './entities/user.entity';
import { SyncUserDto } from './dto/sync-user.dto';
import { UserProfileResponse } from './types/user.types';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly configService: ConfigService,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  async findOrCreate(data: {
    id: string;
    email?: string | null;
    fullName?: string | null;
    role?: UserRole;
  }): Promise<User> {
    const existing = await this.usersRepository.findById(data.id);
    if (existing) {
      if (data.role && existing.role !== data.role) {
        return this.usersRepository.upsertUser({
          ...data,
          role: data.role,
        });
      }
      return existing;
    }
    return this.usersRepository.upsertUser(data);
  }

  async syncUser(userId: string, dto: SyncUserDto): Promise<User> {
    let resolvedRole: UserRole | undefined = dto.role;

    if (!resolvedRole && dto.email) {
      const adminEmails = this.configService.get<string>('ADMIN_EMAILS') || '';
      const adminList = adminEmails
        .split(',')
        .map((e) => e.trim().toLowerCase());
      if (adminList.includes(dto.email.toLowerCase())) {
        resolvedRole = 'admin';
      }
    }

    return this.usersRepository.upsertUser({
      id: userId,
      email: dto.email,
      fullName: dto.fullName,
      role: resolvedRole,
    });
  }

  async getProfile(userId: string): Promise<UserProfileResponse> {
    const user = await this.usersRepository.findByIdWithProgress(userId);
    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' was not found`);
    }

    const completed = user.progress?.filter((p) => p.isCompleted).length || 0;
    const uniqueCourseIds = new Set(user.progress?.map((p) => p.courseId));

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role || 'user',
      completedLessonsCount: completed,
      activeCoursesCount: uniqueCourseIds.size,
      createdAt: user.createdAt,
    };
  }
}
