import { useState, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { ToastContainer, useToast } from '@/components/ui/Toast';
import { useMedia } from '@/hooks/useMedia';
import { ApiClientError } from '@/api/client';
import type { MediaItem } from '@/types';

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml';

export function MediaLibraryPage() {
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toasts, addToast, removeToast } = useToast();

  const { media, total, loading, error, refetch, deleteMedia, uploadMedia } = useMedia({
    page,
    pageSize: 24,
  });

  const totalPages = Math.ceil(total / 24);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await uploadMedia(file);
      }
      addToast(`Uploaded ${files.length} file(s) successfully`, 'success');
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Upload failed.';
      addToast(msg, 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMedia(deleteId);
      addToast('Media deleted', 'info');
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Delete failed.';
      addToast(msg, 'error');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <AppLayout
      title="Media Library"
      actions={
        <>
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
            size="md"
            loading={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            Upload
          </Button>
        </>
      }
    >
      <div className="p-xl">
        <div className="max-w-max_content_width mx-auto">
          <div className="flex items-center justify-between mb-xl">
            <div>
              <h1 className="text-h1 font-h1 text-on-background">Media Library</h1>
              <p className="text-body-md text-on-surface-variant mt-xs">
                Upload and manage images and SVG files.
              </p>
            </div>
            <button
              onClick={refetch}
              className="flex items-center gap-sm text-primary text-label-md font-label-md hover:bg-primary/5 px-md py-2 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Refresh
            </button>
          </div>

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
            <div className="flex items-center gap-sm p-md rounded-xl bg-error/10 border border-error/20 text-error text-body-md mb-lg">
              <span className="material-symbols-outlined">error</span>
              {error}
              <button onClick={refetch} className="ml-auto underline text-label-md">Retry</button>
            </div>
          )}

          {!loading && !error && media.length === 0 && (
            <div className="flex flex-col items-center justify-center p-xl border-2 border-dashed border-outline-variant rounded-xl text-center">
              <span className="material-symbols-outlined text-[48px] text-outline-variant mb-md">perm_media</span>
              <h3 className="text-h3 font-h3 text-on-background">No media yet</h3>
              <p className="text-body-md text-on-surface-variant max-w-sm mb-lg mt-sm">
                Upload images (JPEG, PNG, GIF, WebP) or SVG files to get started.
              </p>
              <Button variant="primary" icon="upload" onClick={() => fileInputRef.current?.click()}>
                Upload Files
              </Button>
            </div>
          )}

          {!loading && media.length > 0 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-md">
                {media.map((item) => (
                  <MediaCard key={item.id} item={item} onDelete={() => setDeleteId(item.id)} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-xl flex items-center justify-center gap-xs">
                  <PaginationButton disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                    <span className="material-symbols-outlined">chevron_left</span>
                  </PaginationButton>
                  <span className="text-body-md text-on-surface-variant px-md">
                    Page {page} of {totalPages}
                  </span>
                  <PaginationButton disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    <span className="material-symbols-outlined">chevron_right</span>
                  </PaginationButton>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {deleteId && (
        <DeleteModal
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </AppLayout>
  );
}

function MediaCard({ item, onDelete }: { item: MediaItem; onDelete: () => void }) {
  const isSvg = item.mimeType === 'image/svg+xml';
  const fileName = item.key.split('/').pop() ?? item.key;

  return (
    <div className="group relative bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="aspect-square bg-surface-container flex items-center justify-center p-sm">
        {isSvg ? (
          <img src={item.url} alt={fileName} className="max-w-full max-h-full object-contain" />
        ) : (
          <img src={item.url} alt={fileName} className="w-full h-full object-cover" />
        )}
      </div>
      <div className="p-sm">
        <p className="text-label-sm text-on-surface truncate" title={fileName}>{fileName}</p>
        <p className="text-[11px] text-on-surface-variant font-mono truncate">{item.mimeType}</p>
      </div>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-xs">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 bg-surface/90 rounded-lg text-on-surface-variant hover:text-primary shadow-sm"
          title="Open"
        >
          <span className="material-symbols-outlined text-[18px]">open_in_new</span>
        </a>
        <button
          onClick={onDelete}
          className="p-1.5 bg-surface/90 rounded-lg text-on-surface-variant hover:text-error shadow-sm"
          title="Delete"
        >
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </div>
    </div>
  );
}

function PaginationButton({
  children, disabled, onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-10 h-10 flex items-center justify-center rounded-lg text-body-md font-medium transition-colors border border-outline-variant bg-surface hover:bg-surface-container-high ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
}

function DeleteModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-surface rounded-xl p-xl shadow-2xl border border-outline-variant w-full max-w-sm mx-md">
        <div className="flex items-center gap-md mb-md">
          <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-error">delete</span>
          </div>
          <h3 className="text-h3 font-h3 text-on-surface">Delete media?</h3>
        </div>
        <p className="text-body-md text-on-surface-variant mb-xl">
          This will permanently delete the file. This action cannot be undone.
        </p>
        <div className="flex gap-md justify-end">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm}>Delete</Button>
        </div>
      </div>
    </div>
  );
}
