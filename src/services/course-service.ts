import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type { DbCourse, DbModule, DbLesson } from "../lib/supabase";
import { MOCK_COURSES } from "../lib/mock-data";
import type { Course, CourseModule, CourseLesson, LessonResource } from "../types/courses";

function formatSecondsToDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

function mapDbToCourse(
  dbCourse: DbCourse,
  dbModules: DbModule[] = [],
  dbLessons: DbLesson[] = [],
  fallbackCourse?: Course
): Course {
  const modulesWithLessons: CourseModule[] = dbModules
    .sort((a, b) => a.position - b.position)
    .map((mod) => {
      const lessons: CourseLesson[] = dbLessons
        .filter((l) => l.module_id === mod.id)
        .sort((a, b) => a.position - b.position)
        .map((l) => ({
          id: l.id,
          title: l.title,
          slug: l.slug,
          videoUrl: l.video_url || `https://www.youtube.com/watch?v=${l.youtube_video_id}`,
          youtubeVideoId: l.youtube_video_id,
          thumbnailUrl: `https://i.ytimg.com/vi/${l.youtube_video_id}/hqdefault.jpg`,
          duration: l.duration || 0,
          durationFormatted: formatSecondsToDuration(l.duration || 0),
          freePreview: !!l.free_preview,
          studentCount: dbCourse.student_count || 0,
          notes: l.notes || [],
          notesText: l.notes_plain || "",
          keyPoints: l.key_points || [],
          proTip: l.pro_tip || "",
          resources: (l.resources as LessonResource[]) || [],
        }));

      const totalModSecs = lessons.reduce((acc, cur) => acc + cur.duration, 0);

      return {
        id: mod.id,
        title: mod.title,
        summary: mod.summary || "",
        description: mod.summary || "",
        duration: formatSecondsToDuration(totalModSecs),
        lessons,
      };
    });

  const totalCourseSeconds = modulesWithLessons.reduce((acc, m) => {
    return acc + (m.lessons?.reduce((lAcc, l) => lAcc + l.duration, 0) || 0);
  }, 0);
  const durationMins = Math.round(totalCourseSeconds / 60);
  const hours = Math.floor(durationMins / 60);
  const mins = durationMins % 60;
  const durationFormatted = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  const levelVal = dbCourse.level
    ? (dbCourse.level.charAt(0).toUpperCase() + dbCourse.level.slice(1))
    : (fallbackCourse?.level || "Intermediate");

  return {
    id: dbCourse.id || (fallbackCourse ? fallbackCourse.id : 1),
    slug: dbCourse.slug,
    title: dbCourse.title,
    description: dbCourse.summary || fallbackCourse?.description || "",
    category: dbCourse.category || fallbackCourse?.category || "Web Development",
    tag: dbCourse.popular ? "POPULAR" : fallbackCourse?.tag || "FEATURED",
    imgUrl: dbCourse.cover_image_url || fallbackCourse?.imgUrl || "",
    level: levelVal as Course["level"],
    duration: durationMins || fallbackCourse?.duration || 120,
    durationFormatted: durationFormatted || fallbackCourse?.durationFormatted || "2h",
    modules: modulesWithLessons.length > 0 ? modulesWithLessons : fallbackCourse?.modules || [],
    learningOutcomes: (dbCourse.learning_outcomes as Course["learningOutcomes"]) || fallbackCourse?.learningOutcomes || [],
    rating: fallbackCourse?.rating || 4.8,
    reviews: fallbackCourse?.reviews || 124,
    enrolled: dbCourse.student_count || fallbackCourse?.enrolled || 18000,
    studentsFormatted: `${(dbCourse.student_count || fallbackCourse?.enrolled || 18000).toLocaleString()}`,
    price: Number(dbCourse.price) || 0,
    isFree: Number(dbCourse.price) === 0,
    isFeatured: !!dbCourse.popular,
    language: "English",
    instructor: {
      name: dbCourse.instructor_name || fallbackCourse?.instructor.name || "Lead Instructor",
      avatar: dbCourse.instructor_avatar || fallbackCourse?.instructor.avatar || "",
      bio: dbCourse.instructor_bio || fallbackCourse?.instructor.bio || "",
    },
    createdAt: dbCourse.created_at || new Date().toISOString(),
  };
}

export const courseService = {
  /**
   * Fetch all courses from Supabase with fallback to local mock data
   */
  async fetchCourses(): Promise<Course[]> {
    if (!isSupabaseConfigured) {
      return MOCK_COURSES;
    }

    try {
      const { data: dbCourses, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: true });

      if (error || !dbCourses || dbCourses.length === 0) {
        return MOCK_COURSES;
      }

      // Merge with MOCK_COURSES to preserve rich assets and images only if slug matches
      return dbCourses.map((dbC) => {
        const fallback = MOCK_COURSES.find((m) => m.slug === dbC.slug);
        return mapDbToCourse(dbC, [], [], fallback);
      });
    } catch (err) {
      console.warn("Supabase fetchCourses error, using fallback:", err);
      return MOCK_COURSES;
    }
  },

  /**
   * Fetch a single course by slug with full modules and lessons
   */
  async fetchCourseBySlug(slug: string): Promise<Course | null> {
    const fallback = MOCK_COURSES.find((c) => c.slug === slug || String(c.id) === slug) || null;

    if (!isSupabaseConfigured) {
      return fallback;
    }

    try {
      let { data: dbCourse, error } = await supabase
        .from("courses")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (!error && !dbCourse) {
        const res = await supabase
          .from("courses")
          .select("*")
          .eq("id", slug)
          .maybeSingle();
        dbCourse = res.data;
        error = res.error;
      }

      if (error || !dbCourse) {
        return fallback;
      }

      // Fetch modules and lessons
      const [{ data: dbModules }, { data: dbLessons }] = await Promise.all([
        supabase.from("modules").select("*").eq("course_id", dbCourse.id),
        supabase.from("lessons").select("*").eq("course_id", dbCourse.id),
      ]);

      return mapDbToCourse(dbCourse, dbModules || [], dbLessons || [], fallback || undefined);
    } catch (err) {
      console.warn("Supabase fetchCourseBySlug error, using fallback:", err);
      return fallback;
    }
  },

  /**
   * Fetch a single course by id or slug
   */
  async fetchCourseById(id: string | number): Promise<Course | null> {
    const fallback = MOCK_COURSES.find((c) => String(c.id) === String(id) || c.slug === String(id)) || null;
    if (fallback) {
      return this.fetchCourseBySlug(fallback.slug);
    }
    return this.fetchCourseBySlug(String(id));
  },

  /**
   * Create a new course in Supabase
   */
  async createCourse(data: Partial<DbCourse>): Promise<Course> {
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

    if (isSupabaseConfigured) {
      const { data: inserted, error } = await supabase
        .from("courses")
        .insert(newDbCourse)
        .select()
        .single();

      if (error) {
        console.error("Supabase createCourse error:", error);
        throw new Error(error.message || "Failed to create course in database");
      }
      return mapDbToCourse(inserted as DbCourse, [], []);
    }

    return mapDbToCourse(newDbCourse, [], []);
  },

  /**
   * Update an existing course in Supabase (by id or slug)
   */
  async updateCourse(idOrSlug: string | number, updates: Partial<DbCourse>): Promise<Course> {
    const target = String(idOrSlug);
    const sanitizedUpdates: Partial<DbCourse> = { ...updates };
    delete sanitizedUpdates.id;
    delete (sanitizedUpdates as Partial<DbCourse> & { created_at?: string }).created_at;

    if (isSupabaseConfigured) {
      // 1. Try updating by id
      let { data: updated, error } = await supabase
        .from("courses")
        .update(sanitizedUpdates)
        .eq("id", target)
        .select()
        .maybeSingle();

      // 2. If not found by id, try updating by slug
      if (!error && !updated) {
        const res = await supabase
          .from("courses")
          .update(sanitizedUpdates)
          .eq("slug", target)
          .select()
          .maybeSingle();
        updated = res.data;
        error = res.error;
      }

      if (error) {
        console.error("Supabase updateCourse error:", error);
        throw new Error(error.message || "Failed to update course in database");
      }

      if (!updated) {
        throw new Error(`Course not found in database with id or slug "${target}"`);
      }

      return mapDbToCourse(updated as DbCourse, [], []);
    }

    const existing = await this.fetchCourseById(target);
    if (!existing) throw new Error(`Course ${target} not found`);
    return {
      ...existing,
      title: updates.title ?? existing.title,
      slug: updates.slug ?? existing.slug,
      description: updates.summary ?? existing.description,
      category: updates.category ?? existing.category,
      price: updates.price !== undefined ? Number(updates.price) : existing.price,
      imgUrl: updates.cover_image_url ?? existing.imgUrl,
      isFeatured: updates.popular !== undefined ? Boolean(updates.popular) : existing.isFeatured,
    };
  },

  /**
   * Delete a course from Supabase (by id or slug)
   */
  async deleteCourse(idOrSlug: string | number): Promise<boolean> {
    const target = String(idOrSlug);
    if (isSupabaseConfigured) {
      // 1. Try deleting by id
      const { error, count } = await supabase
        .from("courses")
        .delete({ count: "exact" })
        .eq("id", target);

      if (error) {
        console.error("Supabase deleteCourse error:", error);
        throw new Error(error.message || "Failed to delete course from database");
      }

      // 2. If 0 rows deleted by id, try deleting by slug
      if (count === 0) {
        const { error: slugError } = await supabase
          .from("courses")
          .delete()
          .eq("slug", target);

        if (slugError) {
          console.error("Supabase deleteCourse error by slug:", slugError);
          throw new Error(slugError.message || "Failed to delete course from database");
        }
      }
    }
    return true;
  },

  /**
   * Fetch a lesson by slug from Supabase
   */
  async fetchLessonBySlug(lessonSlug: string): Promise<CourseLesson | null> {
    if (isSupabaseConfigured) {
      try {
        const { data: dbLesson, error } = await supabase
          .from("lessons")
          .select("*")
          .eq("slug", lessonSlug)
          .maybeSingle();

        if (!error && dbLesson) {
          return {
            id: dbLesson.id,
            title: dbLesson.title,
            slug: dbLesson.slug,
            videoUrl: dbLesson.video_url || `https://www.youtube.com/watch?v=${dbLesson.youtube_video_id}`,
            youtubeVideoId: dbLesson.youtube_video_id,
            thumbnailUrl: `https://i.ytimg.com/vi/${dbLesson.youtube_video_id}/hqdefault.jpg`,
            duration: dbLesson.duration || 0,
            durationFormatted: formatSecondsToDuration(dbLesson.duration || 0),
            freePreview: !!dbLesson.free_preview,
            notes: dbLesson.notes || [],
            notesText: dbLesson.notes_plain || "",
            keyPoints: dbLesson.key_points || [],
            proTip: dbLesson.pro_tip || "",
            resources: dbLesson.resources || [],
          };
        }
      } catch (err) {
        console.warn("Supabase fetchLessonBySlug error, searching fallback:", err);
      }
    }

    // Fallback search across MOCK_COURSES
    for (const course of MOCK_COURSES) {
      for (const mod of course.modules) {
        const found = mod.lessons?.find((l) => l.slug === lessonSlug || l.id === lessonSlug);
        if (found) return found;
      }
    }

    return null;
  },
};
