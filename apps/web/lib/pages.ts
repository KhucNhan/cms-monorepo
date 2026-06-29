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

export async function getPageBySlug(slug: string): Promise<Page | null> {
  try {
    return await apiFetch<Page>(`/api/v1/public/pages/${slug}`, {
      next: { tags: [`page:${slug}`] },
    });
  } catch {
    return null;
  }
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
