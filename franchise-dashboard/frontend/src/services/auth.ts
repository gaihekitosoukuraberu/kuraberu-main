import { apiClient } from './api/client';

interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    companyId?: string;
  };
  accessToken: string;
  refreshToken: string;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', {
      email,
      password,
      deviceId: navigator.userAgent,
    });
    return response.data;
  },

  async logout(refreshToken?: string): Promise<void> {
    await apiClient.post('/auth/logout', { refreshToken });
  },

  async refreshToken(refreshToken: string): Promise<RefreshResponse> {
    const response = await apiClient.post<RefreshResponse>('/auth/refresh', {
      refreshToken,
    });
    return response.data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
  },

  async forgotPassword(email: string): Promise<void> {
    await apiClient.post('/auth/forgot-password', { email });
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/reset-password', {
      token,
      newPassword,
    });
  },

  async getCurrentUser() {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};