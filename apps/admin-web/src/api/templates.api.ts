import { apiClient } from './client';
import type { Template } from '@/types';

export interface PreviewDeleteResponse {
  affectedPageCount: number;
  affectedPages: Array<{ id: string; title: string }>;
}

export interface SetPlaceholderInput {
  type: string;
  orderIndex: number;
}

export const templatesApi = {
  list: () => apiClient.get<Template[]>('/templates'),
  getOne: (id: string) => apiClient.get<Template>(`/templates/${id}`),
  // contentType removed — Template no longer maps 1:1 to a fixed content
  // type; slugPrefix is server-generated from `name`, never sent by client.
  create: (data: { name: string }) => apiClient.post<Template>('/templates', data),
  setPlaceholders: (id: string, placeholders: SetPlaceholderInput[]) =>
    apiClient.patch<Template>(`/templates/${id}/placeholders`, { placeholders }),
  remove: (id: string) => apiClient.delete<{ deleted: boolean }>(`/templates/${id}`),
  previewDelete: (id: string, type: string) =>
    apiClient.post<PreviewDeleteResponse>(`/templates/${id}/placeholders/preview-delete`, { type }),
};