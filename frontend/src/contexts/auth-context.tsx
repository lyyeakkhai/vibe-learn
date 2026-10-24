import { createContext, useContext, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { ApiClient } from "@/lib/api-client";

export interface AuthUser {
  id: string;
  email?: string;
  fullName?: string;
  firstName?: string;
  imageUrl?: string;
  primaryEmailAddress?: { emailAddress: string };
  publicMetadata?: { role?: "admin" | "user" };
}

interface AuthContextType {
  user: AuthUser | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  getToken: () => Promise<string | null>;
  login: (user: AuthUser, token?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = "vibelearn_auth_user";
const TOKEN_STORAGE_KEY = "vibelearn_auth_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (stored) {
        ApiClient.setAuthToken(stored);
      }
      return stored || null;
    } catch {
      return null;
    }
  });

  const [isLoaded] = useState(true);

  const login = (newUser: AuthUser, authToken?: string) => {
    const userToSave: AuthUser = {
      ...newUser,
      firstName: newUser.firstName || newUser.fullName?.split(" ")[0] || "Learner",
      primaryEmailAddress: newUser.email
        ? { emailAddress: newUser.email }
        : newUser.primaryEmailAddress,
    };
    const effectiveToken = authToken || newUser.id;

    setUser(userToSave);
    setToken(effectiveToken);
    ApiClient.setAuthToken(effectiveToken);

    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userToSave));
      localStorage.setItem(TOKEN_STORAGE_KEY, effectiveToken);
    } catch (e) {
      console.warn("Failed to persist auth", e);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    ApiClient.setAuthToken(null);
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch (e) {
      console.warn("Failed to clear auth", e);
    }
  };

  const getToken = async (): Promise<string | null> => {
    return token || user?.id || null;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoaded,
        isSignedIn: Boolean(user),
        getToken,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return {
    getToken: context.getToken,
    isSignedIn: context.isSignedIn,
    userId: context.user?.id || null,
    login: context.login,
    logout: context.logout,
  };
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUser() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useUser must be used within an AuthProvider");
  }
  return {
    user: context.user,
    isLoaded: context.isLoaded,
    isSignedIn: context.isSignedIn,
  };
}

export function SignedIn({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded } = useUser();
  if (!isLoaded || !isSignedIn) return null;
  return <>{children}</>;
}

export function SignedOut({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded } = useUser();
  if (!isLoaded || isSignedIn) return null;
  return <>{children}</>;
}

export function RedirectToSignIn() {
  return <Navigate to="/sign-in" replace />;
}
