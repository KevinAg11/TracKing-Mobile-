import { apiClient, unwrap, type ApiResponse } from '@/core/api/apiClient';
import type { LoginCredentials, LoginResponse } from '../types/auth.types';

export const authApi = {
  /**
   * POST /api/auth/login
   * Returns user data + accessToken in body, also sets httpOnly cookies.
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const res = await apiClient.post<ApiResponse<LoginResponse>>(
      '/api/auth/login',
      credentials,
    );
    return unwrap(res);
  },

  /**
   * POST /api/auth/logout
   * Revokes all tokens and clears cookies.
   */
  async logout(): Promise<void> {
    await apiClient.post<ApiResponse<null>>('/api/auth/logout');
  },

  /**
   * POST /api/auth/refresh
   * Uses httpOnly refresh_token cookie to issue new tokens.
   * One-time use — token is invalidated after use.
   */
  async refresh(): Promise<void> {
    await apiClient.post<ApiResponse<null>>('/api/auth/refresh');
  },
};
