import { useState, useEffect, useCallback, useRef } from 'react';
import { pagesApi, type PagesListResponse } from '@/api/pages.api';
import { ApiClientError } from '@/api/client';
import type { PageFilters } from '@/types';

interface PagesState {
  data: PagesListResponse | null;
  loading: boolean;
  error: string | null;
}

// Module-level cache — sống suốt vòng đời app (không persist qua reload),
// key = JSON.stringify(filters). Cho phép chuyển qua lại giữa các tab
// (templateId khác nhau) đã từng xem mà không thấy loading/nháy trắng.
// Cache đơn giản, không có TTL/eviction — số lượng tab (templates) trong
// thực tế nhỏ nên không đáng lo về memory.
const pagesCache = new Map<string, PagesListResponse>();

export function usePages(filters: PageFilters = {}) {
  const filtersKey = JSON.stringify(filters);
  const cached = pagesCache.get(filtersKey) ?? null;

  const [state, setState] = useState<PagesState>({
    data: cached,
    // Chỉ loading=true khi CHƯA có cache cho key này (lần đầu xem tab này).
    // Nếu đã có cache, hiển thị ngay lập tức, revalidate ngầm phía sau.
    loading: cached === null,
    error: null,
  });

  // Theo dõi filtersKey hiện tại để tránh race condition: nếu user đổi tab
  // liên tục, response của request cũ (đã lỗi thời) không được ghi đè lên
  // state của tab hiện tại.
  const currentKeyRef = useRef(filtersKey);
  currentKeyRef.current = filtersKey;

  const fetch = useCallback(async () => {
    const keyAtRequestTime = filtersKey;
    const hasCache = pagesCache.has(keyAtRequestTime);

    setState((s) => ({
      ...s,
      // Có cache → giữ nguyên data cũ, chỉ đánh dấu đang revalidate ngầm
      // (không dùng để chặn UI, component tự quyết định hiển thị gì).
      // Không có cache → loading thật sự (chưa có gì để hiện).
      loading: !hasCache,
      error: null,
    }));

    try {
      const data = await pagesApi.getAll(filters);
      pagesCache.set(keyAtRequestTime, data);

      // Bỏ qua nếu user đã chuyển sang tab khác trước khi request này xong
      if (currentKeyRef.current !== keyAtRequestTime) return;

      setState({ data, loading: false, error: null });
    } catch (err) {
      if (currentKeyRef.current !== keyAtRequestTime) return;
      console.error('[usePages] error:', err);
      const message = err instanceof ApiClientError ? err.message : 'Failed to load pages.';
      setState((s) => ({ ...s, loading: false, error: message }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  useEffect(() => {
    // Khi filtersKey đổi (chuyển tab), lấy ngay cache của tab mới (nếu có)
    // để hiện tức thì trước khi effect fetch chạy xong.
    const cachedForKey = pagesCache.get(filtersKey) ?? null;
    setState({
      data: cachedForKey,
      loading: cachedForKey === null,
      error: null,
    });
    fetch();
  }, [filtersKey, fetch]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const deletePage = useCallback(
    async (id: string) => {
      await pagesApi.delete(id);
      setState((s) => {
        if (!s.data) return s;
        const next = {
          ...s.data,
          data: s.data.data.filter((p) => p.id !== id),
          meta: { ...s.data.meta, total: s.data.meta?.total - 1 },
        };
        pagesCache.set(filtersKey, next); // đồng bộ cache để không "sống lại" khi quay lại tab
        return { ...s, data: next };
      });
    },
    [filtersKey],
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

export function invalidatePagesCache() {
  pagesCache.clear();
}