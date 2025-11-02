import {
  createContext,
  useContext,
  useMemo,
  useEffect,
  useState,
  useCallback,
} from "react";
import authService, { type AuthUrlsResponse } from "@/services/authService";

export type AppUser = {
  id: string;
  auth0Id: string;
  email: string;
  name?: string;
  picture?: string;
  emailVerified: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type LoginOptions = {
  returnTo?: string;
};

type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AppUser | undefined;
  login: (opts?: LoginOptions) => void;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  fetchUserProfile: () => Promise<AppUser | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [authUrls, setAuthUrls] = useState<AuthUrlsResponse["data"] | null>(
    null
  );

  // Get environment-aware auth URLs
  const getAuthUrls = useCallback(async () => {
    try {
      const data = await authService.getAuthUrls();
      setAuthUrls(data);
      return data;
    } catch (error) {
      console.error("Failed to get auth URLs:", error);
      return null;
    }
  }, []);

  // Fetch user profile from backend
  const fetchUserProfile = useCallback(async () => {
    try {
      const profileData = await authService.getUserProfile();
      if (profileData) {
        console.log("Profile fetched:", profileData);
        setUser(profileData);
        return profileData;
      }
      console.warn("No profile data received");
      return null;
    } catch (error) {
      console.error("Profile fetch failed:", error);
      return null;
    }
  }, []);

  // Check authentication status with backend
  const checkAuth = useCallback(async () => {
    try {
      const authData = await authService.checkAuth();
      if (authData.authenticated) {
        console.log("User is authenticated, fetching profile...");
        // Small delay to ensure session is fully established
        await new Promise((resolve) => setTimeout(resolve, 100));
        await fetchUserProfile();
        return true;
      } else {
        console.log("User not authenticated");
        setUser(undefined);
        return false;
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setUser(undefined);
      return false;
    }
  }, [fetchUserProfile]);

  // Refresh authentication
  const refreshAuth = useCallback(async () => {
    await checkAuth();
  }, [checkAuth]);

  // Check authentication on mount and when URL changes (for auth callback)
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);

      // First, get the auth URLs
      await getAuthUrls();

      // Check if we just returned from Auth0 (auth=success in URL) or logout (auth=logout)
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("auth") === "success") {
        // Remove auth parameter from URL
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        // Force check auth status after successful Auth0 redirect
        console.log("Auth success detected, checking auth status...");

        // Add a longer delay to ensure the session is properly set
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await checkAuth();
      } else if (urlParams.get("auth") === "logout") {
        // Handle logout redirect
        console.log("Logout detected, clearing user state...");
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
        setUser(undefined);
      } else if (urlParams.get("auth") === "error") {
        // Handle auth error
        console.error("Authentication failed");
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
        setUser(undefined);
      } else {
        // Normal page load, check auth
        await checkAuth();
      }

      setIsLoading(false);
    };

    initAuth();
  }, [checkAuth, getAuthUrls]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: !!user,
      isLoading,
      user,
      login: (opts?: LoginOptions) => {
        const returnTo = opts?.returnTo || window.location.pathname;
        const loginUrl = authService.buildLoginUrl(authUrls, returnTo);
        console.log("Redirecting to login:", loginUrl);
        window.location.href = loginUrl;
      },
      logout: async () => {
        console.log("🚪 Logging out...");

        // Clear local user state immediately
        setUser(undefined);

        // Clear backend cookies first
        try {
          const { config } = await import("@/config/env");
          await fetch(`${config.baseApiUrl}/auth/logout`, {
            method: "POST",
            credentials: "include",
          });
          console.log("✅ Backend cookies cleared");
        } catch (error) {
          console.error("Error clearing backend cookies:", error);
        }

        // Redirect to Auth0 logout (this will log out from Auth0 and redirect back)
        const logoutUrl = authService.buildLogoutUrl(authUrls);
        console.log("🔄 Redirecting to Auth0 logout:", logoutUrl);
        window.location.href = logoutUrl;
      },
      refreshAuth,
      fetchUserProfile,
    }),
    [user, isLoading, refreshAuth, authUrls, fetchUserProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
