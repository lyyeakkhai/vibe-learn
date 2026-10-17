export interface CourseSummaryResponse {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  coverImageUrl: string | null;
  category: string | null;
  instructorName: string | null;
  level: string | null;
  price: number;
  popular: boolean;
  studentCount: number;
  durationFormatted?: string;
}

export interface LearningOutcomeItem {
  icon?: string;
  title: string;
  description: string;
}
