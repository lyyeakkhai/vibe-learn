import { useState, useEffect } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { userService } from "@/services/user-service";

export type RoleType = "admin" | "user";

export interface UserRoleResult {
  role: RoleType;
  isAdmin: boolean;
  isLoading: boolean;
}

export function useUserRole(): UserRoleResult {
  const { user, isLoaded: isUserLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();

  const [dbRole, setDbRole] = useState<RoleType | null>(null);
  const [loadingDb, setLoadingDb] = useState(false);

  // 1. Instant check from Clerk's publicMetadata
  const clerkMetadataRole = (user?.publicMetadata?.role as RoleType) || null;

  useEffect(() => {
    let cancelled = false;

    if (!isUserLoaded || !isSignedIn || !user || clerkMetadataRole === "admin") {
      return;
    }

    // Check backend synced user profile
    async function fetchRole() {
      setLoadingDb(true);
      try {
        const token = await getToken();
        const profile = await userService.getMe(token || undefined);
        if (!cancelled && profile?.role) {
          setDbRole(profile.role);
        }
      } catch (err) {
        console.warn("useUserRole fetchRole error:", err);
      } finally {
        if (!cancelled) {
          setLoadingDb(false);
        }
      }
    }

    fetchRole();

    return () => {
      cancelled = true;
    };
  }, [isUserLoaded, isSignedIn, user, clerkMetadataRole, getToken]);

  if (!isUserLoaded) {
    return {
      role: "user",
      isAdmin: false,
      isLoading: true,
    };
  }

  if (!isSignedIn) {
    return {
      role: "user",
      isAdmin: false,
      isLoading: false,
    };
  }

  const effectiveRole: RoleType =
    clerkMetadataRole === "admin" || dbRole === "admin" ? "admin" : (dbRole || "user");

  return {
    role: effectiveRole,
    isAdmin: effectiveRole === "admin",
    isLoading: loadingDb && dbRole === null && clerkMetadataRole === null,
  };
}
