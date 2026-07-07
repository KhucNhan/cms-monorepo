import type { ApiError } from '@/types';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

// ─── Token helpers ────────────────────────────────────────────────────────────

export const tokenStorage = {
  get: () => localStorage.getItem('auth_token'),
  set: (token: string) => localStorage.setItem('auth_token', token),
  clear: () => localStorage.removeItem('auth_token'),
};

// ─── Core fetch ───────────────────────────────────────────────────────────────

export class ApiClientError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStorage.get();
  const hasBody = init.body !== undefined && init.body !== null && init.body !== '';

  const headers: HeadersInit = {
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers ?? {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  // No content
  if (res.status === 204) return undefined as T;

  const payload = await res.json().catch(() => ({ message: res.statusText }));

  if (!res.ok) {
    const err = payload as ApiError & { error?: { message?: string } };
    if (res.status === 401 && !window.location.pathname.startsWith('/login')) {
      tokenStorage.clear();
      window.location.href = '/login';
    }
    const message = err.error?.message ?? err.message ?? 'Something went wrong';
    throw new ApiClientError(res.status, message, payload);
  }

  // Unwrap BE envelope: { success: true, data: ... }
  if (
    payload !== null &&
    typeof payload === 'object' &&
    'success' in payload &&
    'data' in payload
  ) {
    return (payload as { success: boolean; data: T }).data;
  }

  return payload as T;
}

// ─── HTTP methods ─────────────────────────────────────────────────────────────

export const apiClient = {
  get: <T>(path: string) =>
    request<T>(path, { method: 'GET' }),

  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),

  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),

  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),

  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),
};