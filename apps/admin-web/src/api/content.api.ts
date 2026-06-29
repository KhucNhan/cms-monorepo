import { apiClient } from './client';
import type {
  ContentEntry,
  ContentFilters,
  ContentType,
  PaginatedResponse,
} from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildQuery(filters: ContentFilters): string {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters.page)     params.set('page',     String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters.sortBy)   params.set('sortBy',   filters.sortBy);
  if (filters.search)   params.set('search',   filters.search);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

// ─── Content Entries ──────────────────────────────────────────────────────────

export const contentApi = {
  /**
   * GET /api/content-manager/articles
   * Hỗ trợ filter, sort, paginate qua query params
   */
  getEntries: (collectionType: string, filters: ContentFilters = {}) =>
    apiClient.get<PaginatedResponse<ContentEntry>>(
      `/content-manager/${collectionType}${buildQuery(filters)}`,
    ),

  /**
   * GET /api/content-manager/articles/:id
   */
  getEntry: (collectionType: string, id: string) =>
    apiClient.get<ContentEntry>(`/content-manager/${collectionType}/${id}`),

  /**
   * POST /api/content-manager/articles
   */
  createEntry: (collectionType: string, data: Partial<ContentEntry>) =>
    apiClient.post<ContentEntry>(`/content-manager/${collectionType}`, data),

  /**
   * PUT /api/content-manager/articles/:id
   */
  updateEntry: (collectionType: string, id: string, data: Partial<ContentEntry>) =>
    apiClient.put<ContentEntry>(`/content-manager/${collectionType}/${id}`, data),

  /**
   * DELETE /api/content-manager/articles/:id
   */
  deleteEntry: (collectionType: string, id: string) =>
    apiClient.delete<void>(`/content-manager/${collectionType}/${id}`),
};

// ─── Content Type Builder ─────────────────────────────────────────────────────

export const contentTypeApi = {
  /**
   * GET /api/content-type-builder
   */
  getAll: () =>
    apiClient.get<ContentType[]>('/content-type-builder'),

  /**
   * GET /api/content-type-builder/:id
   */
  getOne: (id: string) =>
    apiClient.get<ContentType>(`/content-type-builder/${id}`),

  /**
   * POST /api/content-type-builder
   */
  create: (data: Partial<ContentType>) =>
    apiClient.post<ContentType>('/content-type-builder', data),

  /**
   * PUT /api/content-type-builder/:id
   */
  update: (id: string, data: Partial<ContentType>) =>
    apiClient.put<ContentType>(`/content-type-builder/${id}`, data),

  /**
   * DELETE /api/content-type-builder/:id
   */
  delete: (id: string) =>
    apiClient.delete<void>(`/content-type-builder/${id}`),
};