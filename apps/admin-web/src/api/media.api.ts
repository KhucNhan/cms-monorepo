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
}

export const mediaApi = {
  getAll: (params: MediaListParams = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));
    if (params.mimeType) qs.set('mimeType', params.mimeType);
    const query = qs.toString() ? `?${qs}` : '';
    return fetch(`${BASE_URL}/media${query}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(tokenStorage.get() ? { Authorization: `Bearer ${tokenStorage.get()}` } : {}),
      },
      credentials: 'include',
    }).then(async (res) => {
      const payload = await res.json();
      if (!res.ok) throw new ApiClientError(res.status, payload.message ?? 'Failed to load media', payload);
      return (payload.data ?? payload) as MediaListResponse;
    });
  },

  getOne: (id: string) =>
    fetch(`${BASE_URL}/media/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(tokenStorage.get() ? { Authorization: `Bearer ${tokenStorage.get()}` } : {}),
      },
      credentials: 'include',
    }).then(async (res) => {
      const payload = await res.json();
      if (!res.ok) throw new ApiClientError(res.status, payload.message ?? 'Failed to load media', payload);
      return (payload.data ?? payload) as MediaItem;
    }),

  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`${BASE_URL}/media/upload`, {
      method: 'POST',
      headers: {
        ...(tokenStorage.get() ? { Authorization: `Bearer ${tokenStorage.get()}` } : {}),
      },
      body: formData,
      credentials: 'include',
    }).then(async (res) => {
      const payload = await res.json();
      if (!res.ok) throw new ApiClientError(res.status, payload.message ?? 'Upload failed', payload);
      return (payload.data ?? payload) as MediaItem;
    });
  },

  delete: (id: string) =>
    fetch(`${BASE_URL}/media/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(tokenStorage.get() ? { Authorization: `Bearer ${tokenStorage.get()}` } : {}),
      },
      credentials: 'include',
    }).then(async (res) => {
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new ApiClientError(res.status, payload.message ?? 'Delete failed', payload);
      return payload.data ?? payload;
    }),
};
