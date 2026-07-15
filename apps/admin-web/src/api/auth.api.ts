import { apiClient } from './client';
import type { LoginPayload, LoginResponse, AuthUser } from '@/types';

export const authApi = {
  /**
   * POST /api/v1/auth/login
   * Returns: { accessToken } (wrapped by BE interceptor → unwrapped by client)
   */
  login: (payload: LoginPayload) =>
    apiClient.post<LoginResponse>('/auth/login', payload),

  /**
   * POST /api/v1/auth/logout
   */
  logout: () =>
    apiClient.post<void>('/auth/logout', {}),

  /**
   * GET /api/v1/auth/me — trả về JwtPayload của user đang đăng nhập
   * (auth.controller.ts dùng @Get('me'), không phải @Post)
   */
  me: () =>
    apiClient.get<AuthUser>('/auth/me'),
};