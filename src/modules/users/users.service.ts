import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { User } from './entities/user.entity';
import { SyncUserDto } from './dto/sync-user.dto';
import { UserProfileResponse } from './types/user.types';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  async findOrCreate(data: { id: string; email?: string | null; fullName?: string | null }): Promise<User> {
    const existing = await this.usersRepository.findById(data.id);
    if (existing) {
      return existing;
    }
    return this.usersRepository.upsertUser(data);
  }

  async syncUser(userId: string, dto: SyncUserDto): Promise<User> {
    return this.usersRepository.upsertUser({
      id: userId,
      email: dto.email,
      fullName: dto.fullName,
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
      completedLessonsCount: completed,
      activeCoursesCount: uniqueCourseIds.size,
      createdAt: user.createdAt,
    };
  }
}
