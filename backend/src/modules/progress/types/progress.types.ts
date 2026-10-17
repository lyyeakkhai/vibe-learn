export interface UserProgressState {
  lessonId: string;
  courseId: string;
  isCompleted: boolean;
  resumeTimestamp: number;
  updatedAt: Date;
}

export interface CourseProgressSummary {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  lastResumeLessonId: string | null;
  lastResumeTimestamp: number;
}
