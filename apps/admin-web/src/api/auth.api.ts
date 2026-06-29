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
   * POST /api/v1/auth/me — trả về JwtPayload của user đang đăng nhập
   * BE dùng @Post('me') không phải @Get
   */
  me: () =>
    apiClient.post<AuthUser>('/auth/me', {}),
};
