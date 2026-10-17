import { ApiClient } from "../lib/api-client";

export interface UserProgressState {
  lessonId: string;
  courseId: string;
  isCompleted: boolean;
  resumeTimestamp: number;
  updatedAt: string;
}

const LOCAL_STORAGE_KEY_PREFIX = "vibelearn_progress_";

function getLocalProgress(userId: string): Record<string, UserProgressState> {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalProgress(userId: string, progress: Record<string, UserProgressState>) {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(progress));
  } catch (e) {
    console.warn("Failed to write progress to localStorage:", e);
  }
}

function mapToUserProgressState(item: any): UserProgressState {
  return {
    lessonId: String(item.lessonId || item.lesson_id || ""),
    courseId: String(item.courseId || item.course_id || ""),
    isCompleted: Boolean(item.isCompleted ?? item.is_completed ?? false),
    resumeTimestamp: Number(item.resumeTimestamp ?? item.resume_timestamp ?? 0),
    updatedAt: item.updatedAt
      ? typeof item.updatedAt === "string"
        ? item.updatedAt
        : new Date(item.updatedAt).toISOString()
      : new Date().toISOString(),
  };
}

export const progressService = {
  /**
   * Fetch all progress records for a user, optionally filtered by courseId
   * Uses GET /progress?courseId=...
   */
  async fetchUserProgress(
    userId: string,
    courseId?: string,
    token?: string | null
  ): Promise<UserProgressState[]> {
    if (!userId) return [];

    const localMap = getLocalProgress(userId);

    try {
      const params = new URLSearchParams();
      if (courseId) {
        params.set("courseId", courseId);
      }
      const query = params.toString() ? `?${params.toString()}` : "";
      const data = await ApiClient.get<any[]>(`/progress${query}`, token);

      if (Array.isArray(data) && data.length > 0) {
        const results: UserProgressState[] = data.map(mapToUserProgressState);

        for (const item of results) {
          localMap[item.lessonId] = item;
        }
        saveLocalProgress(userId, localMap);

        return results;
      }
    } catch (err) {
      console.warn("ApiClient fetchUserProgress error, using local fallback:", err);
    }

    // Return from local cache
    return Object.values(localMap).filter((item) =>
      courseId ? item.courseId === courseId : true
    );
  },

  /**
   * Get list of completed lesson IDs for quick UI checklist checks
   * Uses GET /progress/completed-ids?courseId=...
   */
  async fetchCompletedLessonIds(
    userId: string,
    courseId?: string,
    token?: string | null
  ): Promise<string[]> {
    if (!userId) return [];

    const localMap = getLocalProgress(userId);

    try {
      const params = new URLSearchParams();
      if (courseId) {
        params.set("courseId", courseId);
      }
      const query = params.toString() ? `?${params.toString()}` : "";
      const ids = await ApiClient.get<string[]>(`/progress/completed-ids${query}`, token);

      if (Array.isArray(ids) && ids.length > 0) {
        for (const id of ids) {
          if (localMap[id]) {
            localMap[id].isCompleted = true;
          } else {
            localMap[id] = {
              lessonId: id,
              courseId: courseId || "",
              isCompleted: true,
              resumeTimestamp: 0,
              updatedAt: new Date().toISOString(),
            };
          }
        }
        saveLocalProgress(userId, localMap);
        return ids;
      }
    } catch (err) {
      console.warn("ApiClient fetchCompletedLessonIds error, falling back to local progress:", err);
    }

    // Fallback: check local cache
    return Object.values(localMap)
      .filter((p) => (courseId ? p.courseId === courseId : true) && p.isCompleted)
      .map((p) => p.lessonId);
  },

  /**
   * Upsert progress record (handles both completion status and resume timestamps)
   * Uses POST /progress
   */
  async upsertProgress(params: {
    userId: string;
    lessonId: string;
    courseId: string;
    isCompleted?: boolean;
    resumeTimestamp?: number;
    token?: string | null;
  }): Promise<UserProgressState> {
    const { userId, lessonId, courseId, isCompleted, resumeTimestamp, token } = params;

    // Update local cache immediately for responsive UI
    const localMap = getLocalProgress(userId);
    const existing = localMap[lessonId] || {
      lessonId,
      courseId,
      isCompleted: false,
      resumeTimestamp: 0,
      updatedAt: new Date().toISOString(),
    };

    const updatedState: UserProgressState = {
      lessonId,
      courseId,
      isCompleted: isCompleted !== undefined ? isCompleted : existing.isCompleted,
      resumeTimestamp:
        resumeTimestamp !== undefined
          ? Math.max(0, Math.floor(resumeTimestamp))
          : existing.resumeTimestamp,
      updatedAt: new Date().toISOString(),
    };

    localMap[lessonId] = updatedState;
    saveLocalProgress(userId, localMap);

    // Persist to NestJS backend: POST /progress
    try {
      const payload: {
        courseId: string;
        lessonId: string;
        isCompleted?: boolean;
        resumeTimestamp?: number;
      } = {
        courseId,
        lessonId,
      };

      if (isCompleted !== undefined) {
        payload.isCompleted = isCompleted;
      }
      if (resumeTimestamp !== undefined) {
        payload.resumeTimestamp = Math.max(0, Math.floor(resumeTimestamp));
      }

      const data = await ApiClient.post<any>("/progress", payload, token);
      if (data) {
        const synced = mapToUserProgressState(data);
        localMap[lessonId] = synced;
        saveLocalProgress(userId, localMap);
        return synced;
      }
    } catch (err) {
      console.warn("ApiClient upsertProgress error, using local state:", err);
    }

    return updatedState;
  },

  /**
   * Toggle or set lesson completion status
   * Uses PATCH /progress/complete
   */
  async toggleLessonComplete(
    userId: string,
    lessonId: string,
    courseId: string,
    isCompleted?: boolean,
    token?: string | null
  ): Promise<UserProgressState> {
    // Update local cache immediately for responsive UI
    const localMap = getLocalProgress(userId);
    const existing = localMap[lessonId] || {
      lessonId,
      courseId,
      isCompleted: false,
      resumeTimestamp: 0,
      updatedAt: new Date().toISOString(),
    };

    const targetCompleted = isCompleted !== undefined ? isCompleted : !existing.isCompleted;

    const updatedState: UserProgressState = {
      ...existing,
      lessonId,
      courseId,
      isCompleted: targetCompleted,
      updatedAt: new Date().toISOString(),
    };

    localMap[lessonId] = updatedState;
    saveLocalProgress(userId, localMap);

    // Call NestJS backend endpoint: PATCH /progress/complete
    try {
      const payload: {
        courseId: string;
        lessonId: string;
        isCompleted?: boolean;
      } = {
        courseId,
        lessonId,
        isCompleted: targetCompleted,
      };

      const data = await ApiClient.patch<any>("/progress/complete", payload, token);
      if (data) {
        const synced = mapToUserProgressState(data);
        localMap[lessonId] = synced;
        saveLocalProgress(userId, localMap);
        return synced;
      }
    } catch (err) {
      console.warn("ApiClient toggleComplete error, using local state:", err);
    }

    return updatedState;
  },

  /**
   * Mark lesson complete (delegates to toggle/complete endpoint)
   * Uses PATCH /progress/complete
   */
  async markLessonComplete(
    userId: string,
    lessonId: string,
    courseId: string,
    isCompleted = true,
    token?: string | null
  ): Promise<UserProgressState> {
    return this.toggleLessonComplete(userId, lessonId, courseId, isCompleted, token);
  },

  /**
   * Save playback position (resume timestamp in seconds)
   * Uses POST /progress
   */
  async updateResumeTimestamp(
    userId: string,
    lessonId: string,
    courseId: string,
    resumeTimestamp: number,
    token?: string | null
  ): Promise<UserProgressState> {
    return this.upsertProgress({
      userId,
      lessonId,
      courseId,
      resumeTimestamp: Math.max(0, Math.floor(resumeTimestamp)),
      token,
    });
  },
};
