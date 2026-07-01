import { apiClient } from './client';
import type { PageVersion } from '@/types';

export type PageVersionWithCount = PageVersion & {
  _count: { blocks: number };
  page: { id: string; slug: string };
};

export const pageVersionsApi = {
  findDraft: (pageId: string) =>
    apiClient.get<PageVersion | null>(
    `/page-versions?pageId=${pageId}&status=DRAFT`  // ← thêm &status=DRAFT
  ),

  /** List ARCHIVED versions. pageId optional — omit to get all pages. */
  findArchived: (pageId?: string) =>
    apiClient.get<PageVersionWithCount[]>(
      pageId ? `/page-versions/archived?pageId=${pageId}` : '/page-versions/archived',
    ),

  fork: (versionId: string) =>
    apiClient.post<PageVersion>(`/page-versions/${versionId}/fork`, {}),

  /** Delete a DRAFT or ARCHIVED version. */
  deleteVersion: (versionId: string) =>
    apiClient.delete<void>(`/page-versions/${versionId}`),

  /** @deprecated use deleteVersion */
  deleteDraft: (versionId: string) =>
    apiClient.delete<void>(`/page-versions/${versionId}`),

  /**
   * Revert page về một PUBLISHED version:
   * Xóa DRAFT hiện tại (nếu có) và clone version đó thành DRAFT mới.
   */
  revert: (versionId: string) =>
    apiClient.post<PageVersion>(`/page-versions/${versionId}/revert`, {}),
};