import { apiClient } from './client';
import type { PageVersion } from '@/types';

export const pageVersionsApi = {
  findDraft: (pageId: string) =>
    apiClient.get<PageVersion | null>(`/page-versions?pageId=${pageId}`),

  fork: (versionId: string) =>
    apiClient.post<PageVersion>(`/page-versions/${versionId}/fork`, {}),

  /** Delete an orphan DRAFT version (cleanup after a failed save). */
  deleteDraft: (versionId: string) =>
    apiClient.delete<void>(`/page-versions/${versionId}`),
};
