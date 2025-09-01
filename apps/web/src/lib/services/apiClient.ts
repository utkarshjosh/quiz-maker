import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { config } from "@/config/env";

class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: config.baseApiUrl,
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 10000,
      withCredentials: true, // Important: Include cookies in requests
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Response interceptor for error handling and automatic token refresh
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error) => {
        if (error.response) {
          switch (error.response.status) {
            case 401:
              // Unauthorized - could be expired token
              // Try to refresh the token automatically
              try {
                await this.refreshToken();
                // Retry the original request
                const originalRequest = error.config;
                return this.axiosInstance.request(originalRequest);
              } catch (refreshError) {
                // Refresh failed, redirect to login
                console.error("Token refresh failed:", refreshError);
                window.location.href = "/";
              }
              break;
            case 403:
              console.error("Forbidden request");
              break;
            case 404:
              console.error("Resource not found");
              break;
            default:
              console.error("API Error:", error.response.data);
          }
        } else if (error.request) {
          // Request made but no response received
          console.error("No response received:", error.request);
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Automatically refresh the authentication token
   */
  private async refreshToken(): Promise<void> {
    try {
      await fetch("/api/v1/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Failed to refresh token:", error);
      throw error;
    }
  }

  async get<T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.get<T>(url, config);
  }

  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.post<T>(url, data, config);
  }

  async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.put<T>(url, data, config);
  }

  async delete<T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.delete<T>(url, config);
  }

  async patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.patch<T>(url, data, config);
  }
}

export const apiClient = new ApiClient();
