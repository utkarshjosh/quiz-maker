import axios from "axios";
import { config } from "@/config/env";

// Create axios instance with environment-based config
const apiClient = axios.create({
  baseURL: config.baseApiUrl,
  withCredentials: true, // Include cookies for session management
  headers: {
    "Content-Type": "application/json",
  },
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    authenticated: boolean;
    user?: {
      id: string;
      auth0Id: string;
      email: string;
      name?: string;
      picture?: string;
      emailVerified: boolean;
      createdAt?: string;
      updatedAt?: string;
    };
  };
}

export interface AuthUrlsResponse {
  success: boolean;
  message: string;
  data: {
    routes: {
      baseRoute: string;
      login: string;
      logout: string;
      callback: string;
      check: string;
      profile: string;
    };
    baseUrl: string;
  };
}

export const authService = {
  /**
   * Get environment-aware auth URLs
   */
  async getAuthUrls(): Promise<AuthUrlsResponse["data"]> {
    try {
      const response = await apiClient.get<AuthUrlsResponse>("/auth/urls");
      return response.data.data;
    } catch (error) {
      console.error("Failed to fetch auth URLs:", error);
      throw error;
    }
  },

  /**
   * Check authentication status
   */
  async checkAuth(): Promise<AuthResponse["data"]> {
    try {
      const response = await apiClient.get<AuthResponse>("/auth/check");
      return response.data.data;
    } catch (error) {
      console.error("Auth check failed:", error);
      throw error;
    }
  },

  /**
   * Get user profile (requires authentication)
   */
  async getUserProfile(): Promise<AuthResponse["data"]["user"]> {
    try {
      const response = await apiClient.get<AuthResponse>("/auth/profile");
      return response.data.data.user;
    } catch (error) {
      console.error("Profile fetch failed:", error);
      throw error;
    }
  },

  /**
   * Build login URL with returnTo parameter
   */
  buildLoginUrl(
    authUrls: AuthUrlsResponse["data"] | null,
    returnTo?: string
  ): string {
    const baseUrl = authUrls?.baseUrl || config.apiUrl;
    const loginPath =
      authUrls?.routes?.login ||
      `/api/${config.apiVersion}/${config.env}/auth/login`;
    const url = `${baseUrl}${loginPath}`;

    if (returnTo) {
      return `${url}?returnTo=${encodeURIComponent(returnTo)}`;
    }
    return url;
  },

  /**
   * Build logout URL
   */
  buildLogoutUrl(authUrls: AuthUrlsResponse["data"] | null): string {
    const baseUrl = authUrls?.baseUrl || config.apiUrl;
    const logoutPath =
      authUrls?.routes?.logout ||
      `/api/${config.apiVersion}/${config.env}/auth/logout`;
    return `${baseUrl}${logoutPath}`;
  },
};

export default authService;
