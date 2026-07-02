import { useState, useEffect, useCallback } from 'react';
import { mediaApi, type MediaListResponse, type MediaUsageInfo } from '@/api/media.api';
import { ApiClientError } from '@/api/client';
import type { MediaFilters } from '@/types';

interface MediaState {
  data: MediaListResponse | null;
  loading: boolean;
  error: string | null;
}

export function useMedia(filters: MediaFilters = {}) {
  const [state, setState] = useState<MediaState>({
    data: null,
    loading: true,
    error: null,
  });

  const filtersKey = JSON.stringify(filters);

  const fetch = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await mediaApi.getAll(filters);
      setState({ data, loading: false, error: null });
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Failed to load media.';
      setState((s) => ({ ...s, loading: false, error: message }));
    }
  }, [filtersKey]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const deleteMedia = useCallback(async (id: string) => {
    await mediaApi.delete(id);
    setState((s) => {
      if (!s.data) return s;
      return {
        ...s,
        data: {
          ...s.data,
          data: s.data.data.filter((m) => m.id !== id),
          meta: { ...s.data.meta, total: s.data.meta.total - 1 },
        },
      };
    });
  }, []);

  /** Check trước khi xóa: media đang bị block nào tham chiếu (mọi status pageVersion). */
  const checkMediaUsage = useCallback((id: string): Promise<MediaUsageInfo[]> => {
    return mediaApi.getUsages(id);
  }, []);

  const uploadMedia = useCallback(async (file: File) => {
    const created = await mediaApi.upload(file);
    setState((s) => {
      if (!s.data) return { ...s, data: { data: [created], meta: { total: 1, page: 1, pageSize: 24, hasNextPage: false } } };
      return {
        ...s,
        data: {
          ...s.data,
          data: [created, ...s.data.data],
          meta: { ...s.data.meta, total: s.data.meta.total + 1 },
        },
      };
    });
    return created;
  }, []);

  const renameMedia = useCallback(async (id: string, name: string) => {
    const updated = await mediaApi.rename(id, name);
    setState((s) => {
      if (!s.data) return s;
      return {
        ...s,
        data: {
          ...s.data,
          data: s.data.data.map((m) => (m.id === id ? updated : m)),
        },
      };
    });
    return updated;
  }, []);

  return {
    media: state.data?.data ?? [],
    total: state.data?.meta?.total ?? 0,
    page: state.data?.meta?.page ?? 1,
    pageSize: state.data?.meta?.pageSize ?? 24,
    hasNextPage: state.data?.meta?.hasNextPage ?? false,
    loading: state.loading,
    error: state.error,
    refetch: fetch,
    deleteMedia,
    checkMediaUsage,
    uploadMedia,
    renameMedia,
  };
}