import { useState, useEffect, useCallback, useRef } from "react";
import {
  authRefreshService,
  type AuthResponse,
  type TokenInfo,
} from "../services/auth-refresh.service";

export interface UseAuthRefreshReturn {
  isAuthenticated: boolean;
  user: any | null;
  tokenInfo: TokenInfo | null;
  isLoading: boolean;
  error: string | null;
  checkAuth: () => Promise<void>;
  refreshToken: () => Promise<void>;
  logout: () => Promise<void>;
  authenticatedRequest: (
    url: string,
    options?: RequestInit
  ) => Promise<Response>;
}

export const useAuthRefresh = (): UseAuthRefreshReturn => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isInitialized = useRef(false);

  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await authRefreshService.checkAuth();

      setIsAuthenticated(result.authenticated);
      setUser(result.user || null);
      setTokenInfo(result.tokenInfo || null);

      if (result.shouldLogout) {
        await authRefreshService.logout();
      }

      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      console.error("Error checking auth:", err);
      setError("Authentication check failed");
      setIsAuthenticated(false);
      setUser(null);
      setTokenInfo(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      setError(null);

      const result = await authRefreshService.refreshToken();

      setIsAuthenticated(result.authenticated);
      setUser(result.user || null);
      setTokenInfo(result.tokenInfo || null);

      if (result.shouldLogout) {
        await authRefreshService.logout();
      }

      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      console.error("Error refreshing token:", err);
      setError("Token refresh failed");
      setIsAuthenticated(false);
      setUser(null);
      setTokenInfo(null);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setError(null);
      await authRefreshService.logout();

      // Reset state
      setIsAuthenticated(false);
      setUser(null);
      setTokenInfo(null);
    } catch (err) {
      console.error("Error during logout:", err);
      setError("Logout failed");
    }
  }, []);

  const authenticatedRequest = useCallback(
    async (url: string, options?: RequestInit) => {
      try {
        setError(null);
        return await authRefreshService.authenticatedRequest(url, options);
      } catch (err) {
        console.error("Error in authenticated request:", err);
        setError("Request failed");
        throw err;
      }
    },
    []
  );

  // Initialize auth on mount
  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;

      const initializeAuth = async () => {
        try {
          setIsLoading(true);
          const result = await authRefreshService.initialize();

          setIsAuthenticated(result.authenticated);
          setUser(result.user || null);
          setTokenInfo(result.tokenInfo || null);

          if (result.shouldLogout) {
            await authRefreshService.logout();
          }

          if (result.error) {
            setError(result.error);
          }
        } catch (err) {
          console.error("Error initializing auth:", err);
          setError("Authentication initialization failed");
          setIsAuthenticated(false);
          setUser(null);
          setTokenInfo(null);
        } finally {
          setIsLoading(false);
        }
      };

      initializeAuth();
    }

    // Cleanup on unmount
    return () => {
      authRefreshService.cleanup();
    };
  }, []);

  // Set up periodic auth checks (every 5 minutes) - but only if authenticated
  useEffect(() => {
    if (!isAuthenticated || isLoading) return;

    const interval = setInterval(
      () => {
        // Only check auth if we're not already refreshing
        if (!authRefreshService.refreshing) {
          checkAuth();
        }
      },
      5 * 60 * 1000
    ); // 5 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated, isLoading, checkAuth]);

  return {
    isAuthenticated,
    user,
    tokenInfo,
    isLoading,
    error,
    checkAuth,
    refreshToken,
    logout,
    authenticatedRequest,
  };
};
