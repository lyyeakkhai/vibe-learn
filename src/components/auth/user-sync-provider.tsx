import { useEffect, useRef, type ReactNode } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { userService } from "@/services/user-service";
import { ApiClient } from "@/lib/api-client";

interface UserSyncProviderProps {
  children?: ReactNode;
}

export function UserSyncProvider({ children }: UserSyncProviderProps) {
  const { user, isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const lastSyncedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) {
      lastSyncedUserIdRef.current = null;
      ApiClient.setAuthToken(null);
      return;
    }

    const currentUser = user;

    async function sync() {
      try {
        const token = await getToken();
        ApiClient.setAuthToken(token || currentUser.id);

        // Prevent duplicate sync within the same session for the same user
        if (lastSyncedUserIdRef.current === currentUser.id) {
          return;
        }
        lastSyncedUserIdRef.current = currentUser.id;

        await userService.syncUser(
          {
            id: currentUser.id,
            email: currentUser.primaryEmailAddress?.emailAddress,
            fullName:
              currentUser.fullName ||
              `${currentUser.firstName || ""}`.trim() ||
              undefined,
          },
          token || undefined,
        );
      } catch (err) {
        console.warn("Failed to sync Clerk user with database:", err);
      }
    }

    sync();
  }, [isLoaded, isSignedIn, user, getToken]);

  return <>{children}</>;
}
