import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useMedia } from '@/hooks/useMedia';
import type { MediaItem } from '@/types';

interface MediaPickerModalProps {
  onSelect: (media: MediaItem) => void;
  onCancel: () => void;
}

export function MediaPickerModal({ onSelect, onCancel }: MediaPickerModalProps) {
  const [page, setPage] = useState(1);
  const { media, total, loading, error, refetch } = useMedia({ page, pageSize: 24 });

  const totalPages = Math.ceil(total / 24);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-surface rounded-xl shadow-2xl border border-outline-variant w-full max-w-3xl mx-md max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center p-lg border-b border-outline-variant">
          <div>
            <h3 className="text-h3 font-h3 text-on-surface">Choose from Media Library</h3>
            <p className="text-body-md text-on-surface-variant mt-xs">Select an image or SVG</p>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-lg">
          {loading && (
            <div className="flex items-center justify-center p-xl text-on-surface-variant gap-sm">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading media…
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center gap-md p-xl text-error">
              <span className="material-symbols-outlined text-[32px]">error</span>
              <p>{error}</p>
              <Button variant="secondary" onClick={refetch}>Retry</Button>
            </div>
          )}

          {!loading && !error && media.length === 0 && (
            <div className="flex flex-col items-center p-xl text-on-surface-variant text-center">
              <span className="material-symbols-outlined text-[48px] mb-md">perm_media</span>
              <p>No media files yet. Upload some in the Media Library first.</p>
            </div>
          )}

          {!loading && media.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-sm">
              {media.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item)}
                  className="group relative aspect-square bg-surface-container rounded-lg border border-outline-variant overflow-hidden hover:border-primary hover:ring-2 hover:ring-primary/30 transition-all"
                >
                  <img
                    src={item.url}
                    alt={item.key}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="p-md border-t border-outline-variant flex items-center justify-center gap-sm">
            <Button variant="ghost" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-body-md text-on-surface-variant">
              Page {page} of {totalPages}
            </span>
            <Button variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
