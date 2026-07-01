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

// Một nơi media đang được tham chiếu (bất kể status của pageVersion)
export interface MediaUsageInfo {
  blockId: string;
  blockType: string;      // ví dụ 'hero', 'faq'
  pageId: string;
  pageTitle: string;
  pageSlug: string;
  pageVersionId: string;
  pageVersionStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

// Lỗi riêng khi xóa media bị chặn vì đang được dùng — FE bắt lỗi này để
// hiện modal xác nhận lần 2 thay vì toast lỗi thông thường.
export class MediaInUseError extends ApiClientError {
  usages: MediaUsageInfo[];
  constructor(status: number, message: string, usages: MediaUsageInfo[]) {
    super(status, message, { usages });
    this.name = 'MediaInUseError';
    this.usages = usages;
  }
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

  /**
   * Xóa media.
   * - Lần gọi đầu (force=false, mặc định): nếu media đang được block nào đó tham
   *   chiếu (bất kể status DRAFT/PUBLISHED/ARCHIVED của pageVersion chứa block đó),
   *   BE trả 409 { error: { code: 'MEDIA_IN_USE', details: MediaUsageInfo[] } }
   *   → FE ném MediaInUseError để UI hiện modal xác nhận với danh sách nơi đang dùng.
   * - Gọi lại với force=true (sau khi user xác nhận): BE xóa media VÀ tự động
   *   loại bỏ reference tới media này khỏi field `data` (JSONB) của các block liên quan.
   */
  delete: (id: string, force = false) =>
    fetch(`${BASE_URL}/media/${id}${force ? '?force=true' : ''}`, {
      method: 'DELETE',
      headers: authHeaders(),
      credentials: 'include',
    }).then(async (res) => {
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409 && payload?.error?.code === 'MEDIA_IN_USE') {
          const usages: MediaUsageInfo[] = payload.error.details ?? [];
          throw new MediaInUseError(res.status, payload.error.message ?? 'Media is in use', usages);
        }
        throw new ApiClientError(res.status, payload.message ?? payload?.error?.message ?? 'Delete failed', payload);
      }
      return payload.data ?? payload;
    }),
};