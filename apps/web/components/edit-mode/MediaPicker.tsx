'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const PAGE_SIZE = 10;

interface MediaItem {
  id: string;
  url: string;
  thumbUrl?: string | null;
  filename?: string;
  key?: string;
}

interface MediaPickerProps {
  onSelect: (media: MediaItem) => void;
  onClose: () => void;
}

type MimeFilter = 'all' | 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | 'image/svg+xml';

const MIME_FILTERS: { label: string; value: MimeFilter }[] = [
  { label: 'Tất cả', value: 'all' },
  { label: 'JPEG', value: 'image/jpeg' },
  { label: 'PNG', value: 'image/png' },
  { label: 'WebP', value: 'image/webp' },
  { label: 'GIF', value: 'image/gif' },
  { label: 'SVG', value: 'image/svg+xml' },
];

export function MediaPicker({ onSelect, onClose }: MediaPickerProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [mimeFilter, setMimeFilter] = useState<MimeFilter>('all');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      qs.set('page', String(page));
      qs.set('pageSize', String(PAGE_SIZE));
      if (searchQuery) qs.set('search', searchQuery);
      if (mimeFilter !== 'all') qs.set('mimeType', mimeFilter);

      const res = await fetch(`${API_URL}/api/v1/media?${qs}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Không tải được media');

      // Envelope thực tế: { success, data: { data: MediaItem[], meta } }
      const payload = json.data ?? {};
      const list: MediaItem[] = Array.isArray(payload) ? payload : (payload.data ?? []);
      const meta = Array.isArray(payload) ? { total: list.length } : (payload.meta ?? { total: list.length });

      setItems(list);
      setTotal(meta.total ?? list.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load media');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, mimeFilter]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_URL}/api/v1/media/upload`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Tải lên thất bại');
      setPage(1);
      await fetchMedia();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50">
      <div className="flex h-[80vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Select Media</h2>
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {uploading ? 'Uploading' : 'Upload Image'}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
              ✕
            </button>
          </div>
        </div>

        <div className="space-y-2 border-b px-4 py-3">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search…"
            className="w-full rounded border px-2 py-1.5 text-sm"
          />
          <div className="flex flex-wrap gap-1">
            {MIME_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => {
                  setMimeFilter(f.value);
                  setPage(1);
                }}
                className={`rounded-full border px-2 py-0.5 text-xs ${
                  mimeFilter === f.value
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-400">No images found.</p>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelect(item)}
                  className="group relative aspect-square overflow-hidden rounded border hover:ring-2 hover:ring-indigo-500"
                  title={item.filename ?? item.key}
                >
                  <img
                    src={item.thumbUrl ?? item.url}
                    alt={item.filename ?? ''}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t px-4 py-2">
          <span className="text-xs text-gray-500">{total > 0 ? `${total} tệp` : ''}</span>
          <div className="flex items-center gap-2 text-xs">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-40"
            >
              ← Previous
            </button>
            <span>
              Page {page}/{totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}