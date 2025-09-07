/**
 * Frontend Authentication Refresh Service
 * Handles automatic token refresh and logout strategies
 */

export interface TokenInfo {
  expiresAt: Date | null;
  isExpired: boolean;
  isNearExpiration: boolean;
}

export interface AuthResponse {
  authenticated: boolean;
  user?: any;
  tokenInfo?: TokenInfo;
  shouldLogout?: boolean;
  error?: string;
}

export class AuthRefreshService {
  private refreshPromise: Promise<AuthResponse> | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private isRefreshing = false;
  private baseUrl: string;

  // Expose isRefreshing for external access
  public get refreshing(): boolean {
    return this.isRefreshing;
  }

  constructor(baseUrl: string = "http://localhost:3000/api/v1/development") {
    this.baseUrl = baseUrl;
  }

  /**
   * Check authentication status with automatic refresh
   */
  public async checkAuth(): Promise<AuthResponse> {
    try {
      console.log("🔍 Checking authentication status");

      const response = await fetch(`${this.baseUrl}/auth/check`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok && data.authenticated) {
        console.log("✅ Authentication check successful");

        // Schedule automatic refresh if token is near expiration
        if (data.tokenInfo?.isNearExpiration) {
          this.scheduleRefresh(data.tokenInfo);
        }

        return data;
      } else {
        console.log("❌ Authentication check failed:", data.error);

        return {
          authenticated: false,
          error: data.error,
          shouldLogout: data.shouldLogout,
        };
      }
    } catch (error) {
      console.error("❌ Error checking authentication:", error);
      return {
        authenticated: false,
        error: "Network error",
        shouldLogout: true,
      };
    }
  }

  /**
   * Refresh JWT token
   */
  public async refreshToken(): Promise<AuthResponse> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshing && this.refreshPromise) {
      console.log("🔄 Refresh already in progress, waiting...");
      return await this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performRefresh();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async performRefresh(): Promise<AuthResponse> {
    try {
      console.log("🔄 Attempting token refresh");

      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Handle different response status codes
      if (response.status === 404) {
        console.log("❌ Refresh endpoint not found (404)");
        return {
          authenticated: false,
          error: "Refresh endpoint not available",
          shouldLogout: true,
        };
      }

      if (response.status === 500) {
        console.log("❌ Server error during refresh (500)");
        return {
          authenticated: false,
          error: "Server error during refresh",
          shouldLogout: true,
        };
      }

      const data = await response.json();

      if (response.ok && data.authenticated) {
        console.log("✅ Token refresh successful");

        // Schedule next refresh
        if (data.tokenInfo) {
          this.scheduleRefresh(data.tokenInfo);
        }

        return data;
      } else {
        console.log("❌ Token refresh failed:", data.error);

        if (data.shouldLogout) {
          await this.logout();
        }

        return {
          authenticated: false,
          error: data.error,
          shouldLogout: data.shouldLogout,
        };
      }
    } catch (error) {
      console.error("❌ Error refreshing token:", error);

      // Don't automatically logout on network errors, just return failure
      return {
        authenticated: false,
        error: "Refresh failed",
        shouldLogout: false, // Don't logout on network errors
      };
    }
  }

  /**
   * Get token information
   */
  public async getTokenInfo(): Promise<TokenInfo | null> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/token-info`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok && data.authenticated) {
        return data.tokenInfo;
      }

      return null;
    } catch (error) {
      console.error("❌ Error getting token info:", error);
      return null;
    }
  }

  /**
   * Logout user
   */
  public async logout(): Promise<void> {
    try {
      console.log("🚪 Logging out user");

      // Clear refresh timer
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
      }

      // Call logout endpoint
      await fetch(`${this.baseUrl}/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("✅ Logout successful");

      // Redirect to login page or home
      window.location.href = "/";
    } catch (error) {
      console.error("❌ Error during logout:", error);
      // Still redirect even if logout call fails
      window.location.href = "/";
    }
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleRefresh(tokenInfo: TokenInfo): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!tokenInfo.expiresAt) {
      console.log("⚠️ No expiration time available, cannot schedule refresh");
      return;
    }

    // Refresh 2 minutes before expiration
    const refreshTime = new Date(tokenInfo.expiresAt.getTime() - 2 * 60 * 1000);
    const now = new Date();
    const delay = refreshTime.getTime() - now.getTime();

    if (delay > 0) {
      console.log(
        `⏰ Scheduling token refresh in ${Math.round(delay / 1000)} seconds`
      );

      this.refreshTimer = setTimeout(async () => {
        console.log("⏰ Automatic token refresh triggered");
        await this.refreshToken();
      }, delay);
    } else {
      console.log("⚠️ Token expires soon, refreshing immediately");
      this.refreshToken();
    }
  }

  /**
   * Make authenticated API request with automatic refresh
   */
  public async authenticatedRequest(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const defaultOptions: RequestInit = {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    };

    const requestOptions = { ...defaultOptions, ...options };

    try {
      let response = await fetch(url, requestOptions);

      // If we get a 401, try to refresh the token (but only once)
      if (response.status === 401) {
        console.log("🔄 Got 401, attempting token refresh");

        // Check if we're already refreshing to prevent infinite loops
        if (this.refreshing) {
          console.log(
            "⚠️ Already refreshing, waiting for current refresh to complete"
          );
          // Wait for current refresh to complete
          if (this.refreshPromise) {
            await this.refreshPromise;
          }
          // Don't retry after waiting, just return the 401
          return response;
        } else {
          const refreshResult = await this.refreshToken();

          if (refreshResult.authenticated) {
            // Retry the original request only once
            console.log("🔄 Retrying request after successful refresh");
            response = await fetch(url, requestOptions);
          } else {
            // Refresh failed, don't retry again
            console.log("❌ Refresh failed, not retrying request");
            return response; // Return the original 401 response
          }
        }
      }

      return response;
    } catch (error) {
      console.error("❌ Error in authenticated request:", error);
      throw error;
    }
  }

  /**
   * Initialize the auth service
   */
  public async initialize(): Promise<AuthResponse> {
    console.log("🚀 Initializing auth service");

    const authResult = await this.checkAuth();

    if (authResult.authenticated && authResult.tokenInfo) {
      this.scheduleRefresh(authResult.tokenInfo);
    }

    return authResult;
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

// Export singleton instance
export const authRefreshService = new AuthRefreshService();
