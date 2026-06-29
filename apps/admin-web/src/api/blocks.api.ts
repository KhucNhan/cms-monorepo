import { apiClient } from './client';
import type { Block } from '@/types';

export const blocksApi = {
  getByVersion: (pageVersionId: string) =>
    apiClient.get<Block[]>(`/blocks?pageVersionId=${pageVersionId}`),

  create: (dto: { pageVersionId: string; type: string; orderIndex: number }) =>
    apiClient.post<Block>('/blocks', dto),

  remove: (blockId: string) =>
    apiClient.delete<{ deleted: boolean }>(`/blocks/${blockId}`),

  update: (blockId: string, dto: { data?: any; orderIndex?: number }) =>
    apiClient.patch<Block>(`/blocks/${blockId}`, dto),

  reorder: (items: { id: string; orderIndex: number }[]) =>
    apiClient.patch<{ success: boolean }>('/blocks/reorder', { order: items }),
};
