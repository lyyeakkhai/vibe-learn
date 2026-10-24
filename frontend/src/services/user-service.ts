import { ApiClient } from "../lib/api-client";
import type { DbUser } from "../types/db";

export type { DbUser };

export interface SyncUserData {
  id: string; // User ID
  email?: string;
  fullName?: string;
}

export interface UserProfile {
  id: string;
  email: string | null;
  fullName: string | null;
  full_name?: string | null;
  role?: "admin" | "user";
  completedLessonsCount: number;
  activeCoursesCount: number;
  createdAt: string;
}

export const userService = {
  /**
   * Sync user data into PostgreSQL via NestJS backend
   * Endpoint: POST /users/sync
   */
  async syncUser(userData: SyncUserData, token?: string): Promise<DbUser | null> {
    if (!userData.id) return null;

    // Graceful fallback local user object if backend is unreachable
    const fallbackUser: DbUser = {
      id: userData.id,
      email: userData.email || null,
      full_name: userData.fullName || null,
      created_at: new Date().toISOString(),
    };

    try {
      const payload: { email?: string; fullName?: string } = {};
      if (userData.email) payload.email = userData.email;
      if (userData.fullName) payload.fullName = userData.fullName;

      // Use explicit token, current ApiClient auth token, or user ID in dev/mock environments
      const authToken =
        token ||
        ApiClient.getAuthToken() ||
        (userData.id.startsWith("user_") ? userData.id : undefined);

      const response = await ApiClient.post<any>("/users/sync", payload, authToken);

      if (!response) {
        return fallbackUser;
      }

      return {
        id: response.id || userData.id,
        email: response.email ?? userData.email ?? null,
        full_name: response.fullName ?? response.full_name ?? userData.fullName ?? null,
        created_at: response.createdAt
          ? new Date(response.createdAt).toISOString()
          : response.created_at || new Date().toISOString(),
      };
    } catch (err: any) {
      console.warn("ApiClient userService.syncUser error, falling back to local user:", err?.message || err);
      return fallbackUser;
    }
  },

  /**
   * Retrieve current authenticated user profile and statistics (completed lessons, active courses)
   * Endpoint: GET /users/me
   */
  async getMe(token?: string): Promise<UserProfile | null> {
    try {
      const response = await ApiClient.get<any>("/users/me", token);
      if (!response) return null;

      return {
        id: response.id,
        email: response.email ?? null,
        fullName: response.fullName ?? response.full_name ?? null,
        full_name: response.fullName ?? response.full_name ?? null,
        role: response.role || "user",
        completedLessonsCount: response.completedLessonsCount ?? 0,
        activeCoursesCount: response.activeCoursesCount ?? 0,
        createdAt: response.createdAt
          ? new Date(response.createdAt).toISOString()
          : new Date().toISOString(),
      };
    } catch (err: any) {
      console.warn("ApiClient userService.getMe error:", err?.message || err);
      return null;
    }
  },

  /**
   * Alias for getMe() to retrieve current user profile and stats
   */
  async getProfile(token?: string): Promise<UserProfile | null> {
    return this.getMe(token);
  },

  /**
   * Retrieve a user by ID
   */
  async getUserById(userId: string, token?: string): Promise<DbUser | null> {
    if (!userId) return null;

    try {
      const authToken =
        token ||
        ApiClient.getAuthToken() ||
        (userId.startsWith("user_") ? userId : undefined);

      const profile = await this.getMe(authToken);
      if (profile && (!userId || profile.id === userId)) {
        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.fullName || profile.full_name || null,
          created_at: profile.createdAt,
        };
      }
      return null;
    } catch (err: any) {
      console.warn("ApiClient userService.getUserById error:", err?.message || err);
      return null;
    }
  },
};
