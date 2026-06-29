import { useState, useEffect, useCallback } from 'react';
import { contentApi } from '@/api/content.api';
import { ApiClientError } from '@/api/client';
import type { ContentEntry, ContentFilters, PaginatedResponse } from '@/types';

interface ContentState {
  data: PaginatedResponse<ContentEntry> | null;
  loading: boolean;
  error: string | null;
}

export function useContentEntries(collectionType: string, filters: ContentFilters = {}) {
  const [state, setState] = useState<ContentState>({
    data: null,
    loading: true,
    error: null,
  });

  // Serialize filters so useEffect dep array is stable
  const filtersKey = JSON.stringify(filters);

  const fetch = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await contentApi.getEntries(collectionType, filters);
      setState({ data, loading: false, error: null });
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : 'Failed to load entries.';
      setState((s) => ({ ...s, loading: false, error: message }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionType, filtersKey]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteEntry = useCallback(
    async (id: string) => {
      await contentApi.deleteEntry(collectionType, id);
      // Optimistic remove from local state
      setState((s) => {
        if (!s.data) return s;
        return {
          ...s,
          data: {
            ...s.data,
            data: s.data.data.filter((e) => e.id !== id),
            total: s.data.total - 1,
          },
        };
      });
    },
    [collectionType],
  );

  return {
    entries: state.data?.data ?? [],
    total: state.data?.total ?? 0,
    page: state.data?.page ?? 1,
    pageSize: state.data?.pageSize ?? 10,
    loading: state.loading,
    error: state.error,
    refetch: fetch,
    deleteEntry,
  };
}