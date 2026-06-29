import { useState, useEffect, useCallback } from 'react';
import { pagesApi, type PagesListResponse } from '@/api/pages.api';
import { ApiClientError } from '@/api/client';
import type { PageFilters } from '@/types';

interface PagesState {
  data: PagesListResponse | null;
  loading: boolean;
  error: string | null;
}

export function usePages(filters: PageFilters = {}) {
  const [state, setState] = useState<PagesState>({
    data: null,
    loading: true,
    error: null,
  });

  const filtersKey = JSON.stringify(filters);

  const fetch = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await pagesApi.getAll(filters);
      console.log('[usePages] response:', data); // ← thêm dòng này
      setState({ data, loading: false, error: null });
    } catch (err) {
      console.error('[usePages] error:', err); // ← và dòng này
      const message = err instanceof ApiClientError ? err.message : 'Failed to load pages.';
      setState((s) => ({ ...s, loading: false, error: message }));
    }
  }, [filtersKey]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const deletePage = useCallback(
    async (id: string) => {
      await pagesApi.delete(id);
      // Optimistic remove
      setState((s) => {
        if (!s.data) return s;
        return {
          ...s,
          data: {
            ...s.data,
            data: s.data.data.filter((p) => p.id !== id),
            meta: { ...s.data.meta, total: s.data.meta?.total - 1 },
          },
        };
      });
    },
    [],
  );

  return {
    pages: state.data?.data ?? [],
    total: state.data?.meta?.total ?? 0,
    page: state.data?.meta?.page ?? 1,
    pageSize: state.data?.meta?.pageSize ?? 20,
    hasNextPage: state.data?.meta?.hasNextPage ?? false,
    loading: state.loading,
    error: state.error,
    refetch: fetch,
    deletePage,
  };
}
