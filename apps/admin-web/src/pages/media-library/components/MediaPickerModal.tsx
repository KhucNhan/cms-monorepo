import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useMedia } from '@/hooks/useMedia';
import { mediaApi } from '@/api/media.api';
import { ApiClientError } from '@/api/client';
import type { MediaItem } from '@/types';

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml';

interface MediaPickerModalProps {
  onSelect: (media: MediaItem) => void;
  onCancel: () => void;
}

export function MediaPickerModal({ onSelect, onCancel }: MediaPickerModalProps) {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { media, total, loading, error, refetch } = useMedia({
    page,
    pageSize: 24,
    search: searchQuery || undefined,
  });

  const totalPages = Math.ceil(total / 24);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      for (const file of Array.from(files)) {
        await mediaApi.upload(file);
      }
      setPage(1);
      await refetch();
      setUploadSuccess(`Uploaded ${files.length} file(s) successfully`);
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Upload failed.';
      setUploadError(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isEmpty = !loading && !error && media.length === 0;
  const emptyMessage = searchQuery
    ? `No images matching "${searchQuery}"`
    : 'No media files yet. Upload an image below.';

  return (
    <Dialog open onOpenChange={() => {/* no-op: chỉ đóng qua nút X hoặc Cancel */}}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        showCloseButton={false}
        className="bg-surface rounded-xl shadow-2xl border border-outline-variant w-full max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0"
      >
        <div className="flex justify-between items-center p-lg border-b border-outline-variant gap-md">
          <div className="min-w-0">
            <h3 className="text-h3 font-h3 text-on-surface">Choose from Media Library</h3>
            <p className="text-body-md text-on-surface-variant mt-xs">Select an image or upload a new one</p>
          </div>
          <div className="flex items-center gap-sm shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              multiple
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
            />
            <Button
              variant="primary"
              icon="upload"
              size="sm"
              loading={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload
            </Button>
            <button
              onClick={onCancel}
              className="p-1 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        <div className="px-lg pt-md pb-sm border-b border-outline-variant">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by filename…"
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg pl-10 pr-sm py-2 text-body-md focus:border-primary outline-none"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-sm top-1/2 -translate-y-1/2 p-0.5 hover:bg-surface-container-high rounded-full text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>
          {uploadError && (
            <p className="text-label-sm text-error mt-sm flex items-center gap-xs">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {uploadError}
            </p>
          )}
          {uploadSuccess && (
            <p className="text-label-sm text-primary mt-sm flex items-center gap-xs">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              {uploadSuccess}
            </p>
          )}
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

          {isEmpty && (
            <div className="flex flex-col items-center p-xl text-on-surface-variant text-center">
              <span className="material-symbols-outlined text-[48px] mb-md">perm_media</span>
              <p className="mb-md">{emptyMessage}</p>
              {!searchQuery && (
                <Button
                  variant="primary"
                  icon="upload"
                  loading={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload Image
                </Button>
              )}
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
                  title={item.key}
                >
                  <img
                    src={item.url}
                    alt={item.key}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-black/50 px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] text-white truncate">{item.key.split('/').pop()}</p>
                  </div>
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
      </DialogContent>
    </Dialog>
  );
}
