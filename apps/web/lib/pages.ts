import type { Page } from '@/types';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const json = await res.json();
  return (json?.data ?? json) as T;
}

/**
 * Resolves a page by its URL path segments, mirroring the two backend
 * routes:
 *   - 1 segment  -> static page:   GET /public/pages/:slug
 *   - 2 segments -> template page: GET /public/pages/:slugPrefix/:slug
 */
export async function getPageBySegments(segments: string[]): Promise<Page | null> {
  if (segments.length !== 1 && segments.length !== 2) return null;

  const apiPath = `/api/v1/public/pages/${segments.join('/')}`;
  const cacheTag = `page:${segments.join('/')}`;

  try {
    return await apiFetch<Page>(apiPath, { next: { tags: [cacheTag] } });
  } catch {
    return null;
  }
}

/**
 * @deprecated Thin wrapper kept for callers that only ever deal with static,
 * single-segment pages (e.g. app/page.tsx -> 'homepage'). New code that
 * handles arbitrary routes should call getPageBySegments directly.
 */
export async function getPageBySlug(slug: string): Promise<Page | null> {
  return getPageBySegments([slug]);
}

export interface PublishedPageLink {
  id: string;
  slug: string;
  title: string;
}

export async function getPublishedPages(): Promise<PublishedPageLink[]> {
  return apiFetch<PublishedPageLink[]>('/api/v1/public/pages', {
    next: { tags: ['published-pages'] },
  });
}