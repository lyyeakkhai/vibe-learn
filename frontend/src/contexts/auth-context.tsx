import { createContext, useContext, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { ApiClient } from "@/lib/api-client";

export interface AuthUser {
  id: string;
  email?: string;
  fullName?: string;
  firstName?: string;
  imageUrl?: string;
  role?: "admin" | "user";
  primaryEmailAddress?: { emailAddress: string };
  publicMetadata?: { role?: "admin" | "user" };
}

interface AuthContextType {
  user: AuthUser | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  getToken: () => Promise<string | null>;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    fullName?: string,
  ) => Promise<{ id: string; email: string }>;
  logout: () => Promise<void>;
  quickDemoLogin: (role: "admin" | "learner") => void;
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

  const persistAuth = (authUser: AuthUser, authToken: string) => {
    const formattedUser: AuthUser = {
      ...authUser,
      firstName:
        authUser.firstName || authUser.fullName?.split(" ")[0] || "Learner",
      primaryEmailAddress: authUser.email
        ? { emailAddress: authUser.email }
        : authUser.primaryEmailAddress,
      publicMetadata: { role: authUser.role || "user" },
    };

    setUser(formattedUser);
    setToken(authToken);
    ApiClient.setAuthToken(authToken);

    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(formattedUser));
      localStorage.setItem(TOKEN_STORAGE_KEY, authToken);
    } catch (e) {
      console.warn("Failed to persist auth in localStorage", e);
    }
  };

  const login = async (email: string, password: string) => {
    const res = await ApiClient.post<{
      accessToken: string;
      user: AuthUser;
    }>("/auth/login", { email, password });

    if (res?.accessToken && res?.user) {
      persistAuth(res.user, res.accessToken);
    }
  };

  const signup = async (
    email: string,
    password: string,
    fullName?: string,
  ) => {
    return ApiClient.post<{ id: string; email: string }>("/auth/signup", {
      email,
      password,
      fullName,
    });
  };

  const logout = async () => {
    try {
      await ApiClient.post("/auth/logout");
    } catch (err) {
      console.warn("Logout request failed:", err);
    } finally {
      setUser(null);
      setToken(null);
      ApiClient.setAuthToken(null);
      try {
        localStorage.removeItem(USER_STORAGE_KEY);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      } catch (e) {
        console.warn("Failed to clear auth from localStorage", e);
      }
    }
  };

  const quickDemoLogin = (role: "admin" | "learner") => {
    if (role === "admin") {
      persistAuth(
        {
          id: "mock_user_admin",
          email: "admin@vibelearn.io",
          fullName: "Admin User",
          role: "admin",
          publicMetadata: { role: "admin" },
        },
        "mock_user_admin",
      );
    } else {
      persistAuth(
        {
          id: "mock_user_learner",
          email: "learner@vibelearn.io",
          fullName: "Alex Learner",
          role: "user",
          publicMetadata: { role: "user" },
        },
        "mock_user_test",
      );
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
        signup,
        logout,
        quickDemoLogin,
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
    signup: context.signup,
    logout: context.logout,
    quickDemoLogin: context.quickDemoLogin,
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
