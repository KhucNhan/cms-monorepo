import { apiClient } from './client';
import type { Page, PageDetail } from '@/types';

// ─── Response shapes (khớp với BE PagesService) ──────────────────────────────

export interface PagesListResponse {
  data: Page[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    hasNextPage: boolean;
  };
}

export interface PagesListParams {
  page?: number;
  pageSize?: number;
}

// ─── Pages API ────────────────────────────────────────────────────────────────

export const pagesApi = {
  /**
   * GET /api/v1/pages?page=&pageSize=
   * Trả về danh sách pages với published version info
   */
  getAll: (params: PagesListParams = {}) => {
    const qs = new URLSearchParams();
    if (params.page)     qs.set('page',     String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));
    const query = qs.toString() ? `?${qs}` : '';
    return apiClient.get<PagesListResponse>(`/pages${query}`);
  },

  /**
   * GET /api/v1/pages/:idOrSlug
   * Trả về page với full version + blocks info
   */
  getOne: (idOrSlug: string) =>
    apiClient.get<PageDetail>(`/pages/${idOrSlug}`),

  /**
   * POST /api/v1/pages
   * Tạo page mới (tự động tạo DRAFT version)
   */
  create: (data: { slug: string; title?: string; seoMeta?: Record<string, unknown> }) =>
    apiClient.post<Page>('/pages', data),

  /**
   * PATCH /api/v1/pages/:id
   * Cập nhật slug của page
   */
  update: (id: string, data: { slug?: string }) =>
    apiClient.patch<Page>(`/pages/${id}`, data),

  /**
   * DELETE /api/v1/pages/:id
   */
  delete: (id: string) =>
    apiClient.delete<void>(`/pages/${id}`),

  /**
   * POST /api/v1/pages/:pageId/versions/:versionId/publish
   */
  publish: (pageId: string, versionId: string) =>
    apiClient.post<void>(`/pages/${pageId}/versions/${versionId}/publish`, {}),

  /**
   * POST /api/v1/pages/:pageId/versions/:versionId/draft
   * Clone một version thành DRAFT mới
   */
  createDraft: (pageId: string, versionId: string) =>
    apiClient.post<void>(`/pages/${pageId}/versions/${versionId}/draft`, {}),
};
