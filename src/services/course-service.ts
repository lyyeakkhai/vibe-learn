import { ApiClient } from "../lib/api-client";
import type { DbCourse, DbModule, DbLesson } from "../types/db";
import { MOCK_COURSES } from "../lib/mock-data";
import type {
  Course,
  CourseModule,
  CourseLesson,
  LessonResource,
  LearningOutcome,
} from "../types/courses";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface LessonNavigationLink {
  id: string;
  slug: string;
  title: string;
}

export interface LessonDetailResult {
  lesson: CourseLesson;
  previousLesson: LessonNavigationLink | null;
  nextLesson: LessonNavigationLink | null;
}

export function formatSecondsToDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

function parseBio(bio: unknown, fallback?: string): string {
  if (!bio) return fallback || "";
  if (typeof bio !== "string") return fallback || "";
  if (bio.startsWith("{") || bio.startsWith("[")) {
    try {
      const regex = /"text":"([^"]+)"/g;
      const matches: string[] = [];
      let m: RegExpExecArray | null;
      while ((m = regex.exec(bio)) !== null) {
        matches.push(m[1]);
      }
      if (matches.length > 0) {
        return matches.join(" ");
      }
    } catch {
      // Fallback on JSON parse error
    }
  }
  return bio || fallback || "";
}

function normalizeLevel(val?: string | null): Course["level"] {
  if (!val) return "Intermediate";
  const lower = val.toLowerCase();
  if (lower.includes("beg")) return "Beginner";
  if (lower.includes("adv")) return "Advanced";
  return "Intermediate";
}

export function mapApiLessonToCourseLesson(
  l: any,
  courseStudentCount?: number
): CourseLesson {
  const ytId = l.youtubeVideoId || l.youtube_video_id || "";
  const durationSec = Number(l.duration) || 0;
  return {
    id: String(l.id),
    title: l.title || "Untitled Lesson",
    slug: l.slug || "",
    videoUrl:
      l.videoUrl ||
      l.video_url ||
      (ytId ? `https://www.youtube.com/watch?v=${ytId}` : ""),
    youtubeVideoId: ytId,
    thumbnailUrl:
      l.thumbnailUrl ||
      (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : undefined),
    duration: durationSec,
    durationFormatted: formatSecondsToDuration(durationSec),
    freePreview: Boolean(l.freePreview ?? l.free_preview),
    studentCount:
      courseStudentCount ?? (l.studentCount || l.student_count || 0),
    notes: (l.notes as unknown[]) || [],
    notesText: l.notesPlain || l.notes_plain || l.notesText || "",
    keyPoints: (l.keyPoints || l.key_points || []) as string[],
    proTip: l.proTip || l.pro_tip || "",
    resources: (l.resources as LessonResource[]) || [],
  };
}

export function mapApiCourseToCourse(
  apiCourse: any,
  fallbackCourse?: Course
): Course {
  const modulesWithLessons: CourseModule[] = (apiCourse.modules || [])
    .slice()
    .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
    .map((mod: any) => {
      const lessons: CourseLesson[] = (mod.lessons || [])
        .slice()
        .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
        .map((l: any) =>
          mapApiLessonToCourseLesson(
            l,
            apiCourse.studentCount ||
              apiCourse.student_count ||
              fallbackCourse?.enrolled
          )
        );

      const totalModSecs = lessons.reduce(
        (acc, cur) => acc + (cur.duration || 0),
        0
      );

      return {
        id: mod.id,
        title: mod.title || "Module",
        summary: mod.summary || "",
        description: mod.summary || mod.description || "",
        duration: formatSecondsToDuration(totalModSecs),
        lessons,
      };
    });

  const finalModules =
    modulesWithLessons.length > 0
      ? modulesWithLessons
      : fallbackCourse?.modules || [];

  const totalCourseSeconds = finalModules.reduce((acc, m) => {
    return (
      acc + (m.lessons?.reduce((lAcc, l) => lAcc + (l.duration || 0), 0) || 0)
    );
  }, 0);
  const durationMins =
    totalCourseSeconds > 0
      ? Math.round(totalCourseSeconds / 60)
      : Number(apiCourse.duration) || fallbackCourse?.duration || 120;
  const hours = Math.floor(durationMins / 60);
  const mins = durationMins % 60;
  const durationFormatted = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  const levelVal = normalizeLevel(apiCourse.level || fallbackCourse?.level);

  const rawOutcomes = apiCourse.learningOutcomes || apiCourse.learning_outcomes;
  const learningOutcomes: LearningOutcome[] = Array.isArray(rawOutcomes)
    ? rawOutcomes.map((o: any) => ({
        icon: o.icon || "sparkles",
        title: o.title || "",
        description: o.description || "",
      }))
    : fallbackCourse?.learningOutcomes || [];

  const enrolled =
    Number(
      apiCourse.studentCount ??
        apiCourse.student_count ??
        fallbackCourse?.enrolled
    ) || 18000;
  const priceNum = Number(apiCourse.price ?? fallbackCourse?.price ?? 0);
  const isFeatured = Boolean(
    apiCourse.popular ?? apiCourse.isFeatured ?? fallbackCourse?.isFeatured
  );

  return {
    id: apiCourse.id || (fallbackCourse ? fallbackCourse.id : 1),
    slug: apiCourse.slug || fallbackCourse?.slug || "",
    title: apiCourse.title || fallbackCourse?.title || "Untitled Course",
    description:
      apiCourse.summary ||
      apiCourse.description ||
      fallbackCourse?.description ||
      "",
    category:
      apiCourse.category || fallbackCourse?.category || "Web Development",
    tag: isFeatured ? "POPULAR" : fallbackCourse?.tag || "FEATURED",
    imgUrl:
      apiCourse.coverImageUrl ||
      apiCourse.cover_image_url ||
      apiCourse.imgUrl ||
      fallbackCourse?.imgUrl ||
      "",
    level: levelVal,
    duration: durationMins,
    durationFormatted:
      durationFormatted || fallbackCourse?.durationFormatted || "2h",
    modules: finalModules,
    learningOutcomes,
    rating: Number(apiCourse.rating) || fallbackCourse?.rating || 4.8,
    reviews: Number(apiCourse.reviews) || fallbackCourse?.reviews || 124,
    enrolled,
    studentsFormatted: enrolled.toLocaleString(),
    price: priceNum,
    isFree: priceNum === 0,
    isFeatured,
    language: apiCourse.language || fallbackCourse?.language || "English",
    instructor: {
      name:
        apiCourse.instructorName ||
        apiCourse.instructor_name ||
        apiCourse.instructor?.name ||
        fallbackCourse?.instructor.name ||
        "Lead Instructor",
      avatar:
        apiCourse.instructorAvatar ||
        apiCourse.instructor_avatar ||
        apiCourse.instructor?.avatar ||
        fallbackCourse?.instructor.avatar ||
        "",
      bio: parseBio(
        apiCourse.instructorBio ||
          apiCourse.instructor_bio ||
          apiCourse.instructor?.bio,
        fallbackCourse?.instructor.bio
      ),
      expertise:
        apiCourse.instructor?.expertise ||
        fallbackCourse?.instructor.expertise ||
        [],
    },
    createdAt:
      apiCourse.createdAt ||
      apiCourse.created_at ||
      fallbackCourse?.createdAt ||
      new Date().toISOString(),
  };
}

export function mapDbToCourse(
  dbCourse: DbCourse,
  dbModules: DbModule[] = [],
  dbLessons: DbLesson[] = [],
  fallbackCourse?: Course
): Course {
  const modules = dbModules.map((m) => ({
    ...m,
    lessons: dbLessons.filter(
      (l) => l.module_id === m.id || (l as any).moduleId === m.id
    ),
  }));

  return mapApiCourseToCourse(
    {
      ...dbCourse,
      modules:
        modules.length > 0 ? modules : (dbCourse as any).modules || [],
    },
    fallbackCourse
  );
}

function toCreateCourseDto(data: any): Record<string, any> {
  const slug =
    data.slug ||
    data.title
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") ||
    `course-${Date.now()}`;

  const dto: Record<string, any> = {
    slug,
    title: data.title || "Untitled Course",
  };

  const summary = data.summary ?? data.description;
  if (summary !== undefined && summary !== null) dto.summary = String(summary);

  const coverImageUrl =
    data.coverImageUrl ?? data.cover_image_url ?? data.imgUrl;
  if (coverImageUrl !== undefined && coverImageUrl !== null)
    dto.coverImageUrl = String(coverImageUrl);

  const category = data.category;
  if (category !== undefined && category !== null)
    dto.category = String(category);

  const instructorName =
    data.instructorName ?? data.instructor_name ?? data.instructor?.name;
  if (instructorName !== undefined && instructorName !== null)
    dto.instructorName = String(instructorName);

  const instructorBio =
    data.instructorBio ?? data.instructor_bio ?? data.instructor?.bio;
  if (instructorBio !== undefined && instructorBio !== null)
    dto.instructorBio = String(instructorBio);

  const instructorAvatar =
    data.instructorAvatar ?? data.instructor_avatar ?? data.instructor?.avatar;
  if (instructorAvatar !== undefined && instructorAvatar !== null)
    dto.instructorAvatar = String(instructorAvatar);

  if (data.level) {
    dto.level = String(data.level).toLowerCase();
  }

  if (data.price !== undefined && data.price !== null) {
    const p = Number(data.price);
    if (!isNaN(p)) dto.price = p;
  }

  if (data.popular !== undefined) {
    dto.popular = Boolean(data.popular);
  } else if (data.isFeatured !== undefined) {
    dto.popular = Boolean(data.isFeatured);
  }

  const studentCount = data.studentCount ?? data.student_count ?? data.enrolled;
  if (studentCount !== undefined && studentCount !== null) {
    const sc = Number(studentCount);
    if (!isNaN(sc)) dto.studentCount = sc;
  }

  const learningOutcomes = data.learningOutcomes ?? data.learning_outcomes;
  if (Array.isArray(learningOutcomes)) {
    dto.learningOutcomes = learningOutcomes.map((o: any) => ({
      icon: o.icon || "sparkles",
      title: o.title || "",
      description: o.description || "",
    }));
  }

  return dto;
}

function toUpdateCourseDto(data: any): Record<string, any> {
  const dto: Record<string, any> = {};

  if (data.slug !== undefined) dto.slug = String(data.slug);
  if (data.title !== undefined) dto.title = String(data.title);

  const summary = data.summary ?? data.description;
  if (summary !== undefined) dto.summary = String(summary);

  const coverImageUrl =
    data.coverImageUrl ?? data.cover_image_url ?? data.imgUrl;
  if (coverImageUrl !== undefined) dto.coverImageUrl = String(coverImageUrl);

  if (data.category !== undefined) dto.category = String(data.category);

  const instructorName =
    data.instructorName ?? data.instructor_name ?? data.instructor?.name;
  if (instructorName !== undefined) dto.instructorName = String(instructorName);

  const instructorBio =
    data.instructorBio ?? data.instructor_bio ?? data.instructor?.bio;
  if (instructorBio !== undefined) dto.instructorBio = String(instructorBio);

  const instructorAvatar =
    data.instructorAvatar ?? data.instructor_avatar ?? data.instructor?.avatar;
  if (instructorAvatar !== undefined)
    dto.instructorAvatar = String(instructorAvatar);

  if (data.level !== undefined) {
    dto.level = String(data.level).toLowerCase();
  }

  if (data.price !== undefined) {
    const p = Number(data.price);
    if (!isNaN(p)) dto.price = p;
  }

  if (data.popular !== undefined) {
    dto.popular = Boolean(data.popular);
  } else if (data.isFeatured !== undefined) {
    dto.popular = Boolean(data.isFeatured);
  }

  const studentCount = data.studentCount ?? data.student_count ?? data.enrolled;
  if (studentCount !== undefined) {
    const sc = Number(studentCount);
    if (!isNaN(sc)) dto.studentCount = sc;
  }

  const learningOutcomes = data.learningOutcomes ?? data.learning_outcomes;
  if (Array.isArray(learningOutcomes)) {
    dto.learningOutcomes = learningOutcomes.map((o: any) => ({
      icon: o.icon || "sparkles",
      title: o.title || "",
      description: o.description || "",
    }));
  }

  return dto;
}

export const courseService = {
  /**
   * Fetch all courses from NestJS REST API with fallback to local mock data
   */
  async fetchCourses(): Promise<Course[]> {
    // 1. Try NestJS REST API (GET /courses)
    try {
      const apiCourses = await ApiClient.get<any[]>("/courses");
      if (Array.isArray(apiCourses) && apiCourses.length > 0) {
        return apiCourses.map((c) => {
          const fallback = MOCK_COURSES.find(
            (m) => m.slug === c.slug || String(m.id) === String(c.id)
          );
          return mapApiCourseToCourse(c, fallback);
        });
      }
    } catch (err) {
      console.warn("NestJS API fetchCourses error, attempting fallback:", err);
    }

    // 2. Static local fallback
    return MOCK_COURSES;
  },

  /**
   * Fetch a single course by slug with nested modules and lessons
   */
  async fetchCourseBySlug(slug: string): Promise<Course | null> {
    const fallback =
      MOCK_COURSES.find((c) => c.slug === slug || String(c.id) === slug) ||
      null;

    // 1. Try NestJS REST API (GET /courses/:slug)
    try {
      const apiCourse = await ApiClient.get<any>(
        `/courses/${encodeURIComponent(slug)}`
      );
      if (apiCourse && apiCourse.id) {
        return mapApiCourseToCourse(apiCourse, fallback || undefined);
      }
    } catch (err) {
      console.warn(
        `NestJS API fetchCourseBySlug("${slug}") error, attempting fallback:`,
        err
      );
    }

    // 2. Static mock fallback
    return fallback;
  },

  /**
   * Fetch a single course by id or slug
   */
  async fetchCourseById(id: string | number): Promise<Course | null> {
    const target = String(id);
    const fallback =
      MOCK_COURSES.find((c) => String(c.id) === target || c.slug === target) ||
      null;
    const slugToFetch = fallback ? fallback.slug : target;

    // First try the matched slug
    const course = await this.fetchCourseBySlug(slugToFetch);
    if (course) return course;

    // If target was different from slugToFetch, try target directly
    if (slugToFetch !== target) {
      const direct = await this.fetchCourseBySlug(target);
      if (direct) return direct;
    }

    // If target looks like a UUID or ID not matching slug, check all courses
    try {
      const allCourses = await this.fetchCourses();
      const match = allCourses.find(
        (c) => String(c.id) === target || c.slug === target
      );
      if (match && match.slug && match.slug !== target) {
        return this.fetchCourseBySlug(match.slug);
      }
    } catch {
      // Fall through to fallback
    }

    return fallback;
  },

  /**
   * Fetch single lesson with previous and next lesson links (GET /courses/:courseSlug/lessons/:lessonSlug)
   */
  async fetchLesson(
    courseSlug: string,
    lessonSlug: string
  ): Promise<LessonDetailResult | null> {
    // 1. Try NestJS REST API
    try {
      const res = await ApiClient.get<any>(
        `/courses/${encodeURIComponent(courseSlug)}/lessons/${encodeURIComponent(
          lessonSlug
        )}`
      );
      if (res && res.lesson) {
        return {
          lesson: mapApiLessonToCourseLesson(res.lesson),
          previousLesson: res.previousLesson || null,
          nextLesson: res.nextLesson || null,
        };
      }
    } catch (err) {
      console.warn(
        `NestJS API fetchLesson("${courseSlug}", "${lessonSlug}") error, attempting fallback:`,
        err
      );
    }

    // 2. Mock data / Supabase fallback
    const targetCourse =
      MOCK_COURSES.find(
        (c) => c.slug === courseSlug || String(c.id) === courseSlug
      ) ||
      MOCK_COURSES.find((c) =>
        c.modules.some((m) =>
          m.lessons?.some((l) => l.slug === lessonSlug || l.id === lessonSlug)
        )
      );

    if (targetCourse) {
      const allLessons = targetCourse.modules.flatMap((m) => m.lessons || []);
      const idx = allLessons.findIndex(
        (l) => l.slug === lessonSlug || l.id === lessonSlug
      );
      if (idx !== -1) {
        const current = allLessons[idx];
        const prev =
          idx > 0
            ? {
                id: allLessons[idx - 1].id,
                slug: allLessons[idx - 1].slug,
                title: allLessons[idx - 1].title,
              }
            : null;
        const next =
          idx < allLessons.length - 1
            ? {
                id: allLessons[idx + 1].id,
                slug: allLessons[idx + 1].slug,
                title: allLessons[idx + 1].title,
              }
            : null;
        return {
          lesson: current,
          previousLesson: prev,
          nextLesson: next,
        };
      }
    }

    return null;
  },

  /**
   * Alias for fetchLesson with explicit detail naming
   */
  async fetchLessonDetail(
    courseSlug: string,
    lessonSlug: string
  ): Promise<LessonDetailResult | null> {
    return this.fetchLesson(courseSlug, lessonSlug);
  },

  /**
   * Fetch a lesson by slug with optional courseSlug context
   */
  async fetchLessonBySlug(
    lessonSlug: string,
    courseSlug?: string
  ): Promise<CourseLesson | null> {
    if (courseSlug) {
      const detail = await this.fetchLesson(courseSlug, lessonSlug);
      if (detail) return detail.lesson;
    }

    // Search across MOCK_COURSES
    for (const course of MOCK_COURSES) {
      for (const mod of course.modules) {
        const found = mod.lessons?.find(
          (l) => l.slug === lessonSlug || l.id === lessonSlug
        );
        if (found) {
          // Attempt fresh fetch from NestJS API using course slug
          try {
            const detail = await this.fetchLesson(course.slug, lessonSlug);
            if (detail) return detail.lesson;
          } catch {
            // Return local found if API unavailable
          }
          return found;
        }
      }
    }

    return null;
  },

  /**
   * Create a new course via POST /courses with fallback
   */
  async createCourse(
    data: Partial<DbCourse>,
    token?: string | null
  ): Promise<Course> {
    // 1. Try NestJS REST API (POST /courses)
    try {
      const payload = toCreateCourseDto(data);
      const created = await ApiClient.post<any>("/courses", payload, token);
      if (created && created.id) {
        return mapApiCourseToCourse(created);
      }
    } catch (err) {
      console.warn("NestJS API createCourse error, attempting fallback:", err);
    }

    // 2. Fallback to constructed course object if offline
    const courseId = data.id || `course_${Date.now()}`;
    const slug =
      data.slug ||
      data.title
        ?.toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") ||
      `course-${Date.now()}`;

    const newDbCourse: DbCourse = {
      id: courseId,
      slug,
      title: data.title || "Untitled Course",
      summary: data.summary || null,
      cover_image_url: data.cover_image_url || null,
      category: data.category || "Web Development",
      instructor_name: data.instructor_name || "Lead Instructor",
      instructor_bio: data.instructor_bio || null,
      instructor_avatar: data.instructor_avatar || null,
      level: data.level || "intermediate",
      price: data.price !== undefined ? Number(data.price) : 0,
      popular: Boolean(data.popular),
      student_count: data.student_count || 0,
      learning_outcomes: data.learning_outcomes || [],
      created_at: new Date().toISOString(),
    };

    return mapDbToCourse(newDbCourse, [], []);
  },

  /**
   * Update an existing course via PUT /courses/:id with fallback
   */
  async updateCourse(
    idOrSlug: string | number,
    updates: Partial<DbCourse>,
    token?: string | null
  ): Promise<Course> {
    const target = String(idOrSlug);
    const isUuid = UUID_REGEX.test(target);

    // 1. Try NestJS REST API (PUT /courses/:id)
    try {
      let targetId = target;
      if (!isUuid) {
        const existing = await this.fetchCourseById(target);
        if (existing && UUID_REGEX.test(String(existing.id))) {
          targetId = String(existing.id);
        }
      }

      if (UUID_REGEX.test(targetId)) {
        const payload = toUpdateCourseDto(updates);
        const updated = await ApiClient.put<any>(
          `/courses/${targetId}`,
          payload,
          token
        );
        if (updated && updated.id) {
          return mapApiCourseToCourse(updated);
        }
      }
    } catch (err) {
      console.warn(
        `NestJS API updateCourse("${target}") error, attempting fallback:`,
        err
      );
    }

    // 2. Local fallback
    const existing = await this.fetchCourseById(target);
    if (!existing) {
      throw new Error(`Course ${target} not found`);
    }

    return {
      ...existing,
      title: updates.title ?? existing.title,
      slug: updates.slug ?? existing.slug,
      description: updates.summary ?? existing.description,
      category: updates.category ?? existing.category,
      price:
        updates.price !== undefined ? Number(updates.price) : existing.price,
      imgUrl: updates.cover_image_url ?? existing.imgUrl,
      isFeatured:
        updates.popular !== undefined
          ? Boolean(updates.popular)
          : existing.isFeatured,
    };
  },

  /**
   * Delete a course via DELETE /courses/:id with fallback
   */
  async deleteCourse(
    idOrSlug: string | number,
    token?: string | null
  ): Promise<boolean> {
    const target = String(idOrSlug);
    const isUuid = UUID_REGEX.test(target);

    // 1. Try NestJS REST API (DELETE /courses/:id)
    try {
      let targetId = target;
      if (!isUuid) {
        const existing = await this.fetchCourseById(target);
        if (existing && UUID_REGEX.test(String(existing.id))) {
          targetId = String(existing.id);
        }
      }

      if (UUID_REGEX.test(targetId)) {
        await ApiClient.delete(`/courses/${targetId}`, token);
        return true;
      }
    } catch (err) {
      console.warn(
        `NestJS API deleteCourse("${target}") error, attempting fallback:`,
        err
      );
    }

    return true;
  },
};
