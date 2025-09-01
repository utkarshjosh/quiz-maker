import { apiClient } from "./apiClient";

export interface UserProfile {
  id: string;
  auth0Id?: string;
  email: string;
  name?: string;
  picture?: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  profileData?: any;
}

export interface UpdateProfileData {
  name?: string;
  picture?: string;
  profileData?: any;
}

class UserService {
  private readonly baseUrl = "/users";

  async getCurrentUser(): Promise<UserProfile> {
    const response = await apiClient.get(`${this.baseUrl}/me`);
    return response.data.user;
  }

  async getUserById(id: string): Promise<UserProfile> {
    const response = await apiClient.get(`${this.baseUrl}/${id}`);
    return response.data;
  }

  async updateProfile(data: UpdateProfileData): Promise<UserProfile> {
    const response = await apiClient.put(`${this.baseUrl}/profile`, data);
    return response.data;
  }

  async verifyEmail(): Promise<UserProfile> {
    const response = await apiClient.post(`${this.baseUrl}/verify-email`);
    return response.data;
  }

  async deleteAccount(): Promise<{ message: string }> {
    const response = await apiClient.delete(this.baseUrl);
    return response.data;
  }
}

export const userService = new UserService();


