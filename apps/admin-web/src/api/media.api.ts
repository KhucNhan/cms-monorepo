import { tokenStorage, ApiClientError } from './client';
import type { MediaItem } from '@/types';

const BASE_URL = '/api/v1';

export interface MediaListResponse {
  data: MediaItem[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    hasNextPage: boolean;
  };
}

export interface MediaListParams {
  page?: number;
  pageSize?: number;
  mimeType?: string;
  search?: string;
}

const authHeaders = (extra?: Record<string, string>) => ({
  ...(tokenStorage.get() ? { Authorization: `Bearer ${tokenStorage.get()}` } : {}),
  ...extra,
});

export const mediaApi = {
  getAll: (params: MediaListParams = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));
    if (params.mimeType) qs.set('mimeType', params.mimeType);
    if (params.search) qs.set('search', params.search);
    const query = qs.toString() ? `?${qs}` : '';
    return fetch(`${BASE_URL}/media${query}`, {
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
    }).then(async (res) => {
      const payload = await res.json();
      if (!res.ok) throw new ApiClientError(res.status, payload.message ?? 'Failed to load media', payload);
      return (payload.data ?? payload) as MediaListResponse;
    });
  },

  getOne: (id: string) =>
    fetch(`${BASE_URL}/media/${id}`, {
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
    }).then(async (res) => {
      const payload = await res.json();
      if (!res.ok) throw new ApiClientError(res.status, payload.message ?? 'Failed to load media', payload);
      return (payload.data ?? payload) as MediaItem;
    }),

  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    // NOTE: No Content-Type header — browser sets it automatically with
    // the correct multipart/form-data boundary.
    return fetch(`${BASE_URL}/media/upload`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
      credentials: 'include',
    }).then(async (res) => {
      const payload = await res.json();
      if (!res.ok) throw new ApiClientError(res.status, payload.message ?? 'Upload failed', payload);
      return (payload.data ?? payload) as MediaItem;
    });
  },

  rename: (id: string, name: string) =>
    fetch(`${BASE_URL}/media/${id}/rename`, {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ name }),
    }).then(async (res) => {
      const payload = await res.json();
      if (!res.ok) throw new ApiClientError(res.status, payload.message ?? 'Rename failed', payload);
      return (payload.data ?? payload) as MediaItem;
    }),

  // FIX: No Content-Type on DELETE — sending it with no body causes Fastify to
  // attempt body parsing and return 400 Bad Request.
  delete: (id: string) =>
    fetch(`${BASE_URL}/media/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
      credentials: 'include',
    }).then(async (res) => {
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new ApiClientError(res.status, payload.message ?? 'Delete failed', payload);
      return payload.data ?? payload;
    }),
};