import { UserRole } from '../entities/user.entity';

export interface UserProfileResponse {
  id: string;
  email: string | null;
  fullName: string | null;
  role: UserRole;
  completedLessonsCount: number;
  activeCoursesCount: number;
  createdAt: Date;
}
