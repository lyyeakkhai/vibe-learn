export interface UserProfileResponse {
  id: string;
  email: string | null;
  fullName: string | null;
  completedLessonsCount: number;
  activeCoursesCount: number;
  createdAt: Date;
}
