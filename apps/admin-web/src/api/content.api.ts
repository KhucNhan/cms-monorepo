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
   * GET /api/content-management/articles
   * Hỗ trợ filter, sort, paginate qua query params
   */
  getEntries: (collectionType: string, filters: ContentFilters = {}) =>
    apiClient.get<PaginatedResponse<ContentEntry>>(
      `/content-management/${collectionType}${buildQuery(filters)}`,
    ),

  /**
   * GET /api/content-management/articles/:id
   */
  getEntry: (collectionType: string, id: string) =>
    apiClient.get<ContentEntry>(`/content-management/${collectionType}/${id}`),

  /**
   * POST /api/content-management/articles
   */
  createEntry: (collectionType: string, data: Partial<ContentEntry>) =>
    apiClient.post<ContentEntry>(`/content-management/${collectionType}`, data),

  /**
   * PUT /api/content-manamanagementger/articles/:id
   */
  updateEntry: (collectionType: string, id: string, data: Partial<ContentEntry>) =>
    apiClient.put<ContentEntry>(`/content-management/${collectionType}/${id}`, data),

  /**
   * DELETE /api/content-management/articles/:id
   */
  deleteEntry: (collectionType: string, id: string) =>
    apiClient.delete<void>(`/content-management/${collectionType}/${id}`),
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