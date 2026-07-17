import { apiClient } from './client';
import type { Template, TemplateContentType } from '@/types';

export interface PreviewDeleteResponse {
  affectedPageCount: number;
  affectedPages: Array<{
    id: string;
    title: string;
  }>;
}

export const templatesApi = {
  list: () => apiClient.get<Template[]>('/templates'),
  getOne: (id: string) => apiClient.get<Template>(`/templates/${id}`),
  create: (data: { name: string; contentType: TemplateContentType }) =>
    apiClient.post<Template>('/templates', data),
  setPlaceholders: (id: string, placeholders: Array<{ type: string; orderIndex: number }>) =>
    apiClient.patch<Template>(`/templates/${id}/placeholders`, { placeholders }),
  remove: (id: string) => apiClient.delete<{ deleted: boolean }>(`/templates/${id}`),
  previewDelete: (id: string, type: string) =>
    apiClient.post<PreviewDeleteResponse>(`/templates/${id}/placeholders/preview-delete`, { type }),
};
