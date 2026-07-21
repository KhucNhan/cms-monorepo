import { useState, useRef, useCallback } from 'react';
import { useAppLayoutHeader } from '@/context/AppLayoutContext';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { ToastContainer, useToast } from '@/components/ui/Toast';
import { useMedia } from '@/hooks/useMedia';
import { ApiClientError } from '@/api/client';
import type { MediaItem } from '@/types';
import { type MediaUsageInfo } from '@/api/media.api';
import { Can } from '@/components/Can';

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml';

const PAGE_SIZE = 12; // 2 rows × 6 columns

type MimeFilter = 'all' | 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'image/svg+xml';

const MIME_FILTERS: { label: string; value: MimeFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'JPEG', value: 'image/jpeg' },
  { label: 'PNG', value: 'image/png' },
  { label: 'GIF', value: 'image/gif' },
  { label: 'WebP', value: 'image/webp' },
  { label: 'SVG', value: 'image/svg+xml' },
];

interface DeleteTarget {
  id: string;
  checkingUsage: boolean;
  usages: MediaUsageInfo[];
}

/** Format bytes → human-readable KB / MB string. */
function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function MediaLibraryPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [mimeFilter, setMimeFilter] = useState<MimeFilter>('all');
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [infoTarget, setInfoTarget] = useState<MediaItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toasts, addToast, removeToast } = useToast();

  const { media, total, loading, error, refetch, checkMediaUsage, deleteMedia, uploadMedia, updateMedia } = useMedia({
    page,
    pageSize: PAGE_SIZE,
    search: search.trim() || undefined,
    mimeType: mimeFilter === 'all' ? undefined : mimeFilter,
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleMimeFilter = (value: MimeFilter) => {
    setMimeFilter(value);
    setPage(1);
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await uploadMedia(file);
      }
      addToast(`Uploaded ${files.length} file(s) successfully`, 'success');
      if (page !== 1) {
        setPage(1);
      } else {
        refetch();
      }
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Upload failed.';
      addToast(msg, 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Bấm nút xóa trên card → luôn mở modal ở dạng "chưa biết usage",
  // usage thật sự chỉ được biết khi BE từ chối lần xóa đầu (409 MEDIA_IN_USE).
  const openDeleteModal = async (id: string) => {
  setDeleteTarget({ id, checkingUsage: true, usages: [] });
  try {
    const usages = await checkMediaUsage(id); 
    setDeleteTarget({ id, checkingUsage: false, usages });
  } catch (err) {
    const msg = err instanceof ApiClientError ? err.message : 'Failed to check media usage.';
    addToast(msg, 'error');
    setDeleteTarget(null);
  }
};

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMedia(deleteTarget.id); // gọi 1 lần duy nhất
      addToast('Media deleted', 'info');
      setDeleteTarget(null);
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Delete failed.';
      addToast(msg, 'error');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdate = useCallback(
    async (id: string, body: { name?: string; altText?: string }): Promise<MediaItem> => {
      try {
        const updated = await updateMedia(id, body);
        addToast('Saved successfully', 'success');
        // Sync infoTarget nếu modal đang mở cho item này
        setInfoTarget((prev) => (prev?.id === id ? updated : prev));
        return updated;
      } catch (err) {
        const msg = err instanceof ApiClientError ? err.message : 'Save failed.';
        addToast(msg, 'error');
        throw err;
      }
    },
    [updateMedia, addToast],
  );

  useAppLayoutHeader({
    title: 'Media Library',
    actions: [
        <>
          <SearchInput
            placeholder="Search media..."
            value={search}
            onChange={handleSearchChange}
          />
          <Can permission="media:create">
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
          </Can>
          <Button
            variant="ghost"
            icon="refresh"
            size="md"
            onClick={() => refetch()}
          >
            Refresh
          </Button>
        </>
    ]
  })

  return (
    <>
      <div className="p-xl">
        <div className="max-w-max_content_width mx-auto">
          {/* ── Mime-type filter chips ── */}
          <div className="flex flex-wrap items-center gap-xs mb-lg">
            {MIME_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => handleMimeFilter(f.value)}
                className={`px-md py-1.5 rounded-full text-label-sm font-label-sm border transition-colors ${
                  mimeFilter === f.value
                    ? 'bg-primary text-on-primary border-primary'
                    : 'bg-surface-container text-on-surface-variant border-outline-variant hover:bg-surface-container-high'
                }`}
              >
                {f.label}
              </button>
            ))}
            {total > 0 && (
              <span className="ml-auto text-body-sm text-on-surface-variant">
                {total} file{total !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* ── Loading ── */}
          {loading && (
            <div className="flex items-center justify-center p-xl text-on-surface-variant gap-sm">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading media…
            </div>
          )}

          {/* ── Error ── */}
          {error && !loading && (
            <div className="flex items-center gap-sm p-md rounded-xl bg-error/10 border border-error/20 text-error text-body-md mb-lg">
              <span className="material-symbols-outlined">error</span>
              {error}
              <button onClick={refetch} className="ml-auto underline text-label-md">Retry</button>
            </div>
          )}

          {/* ── Empty state ── */}
          {!loading && !error && media.length === 0 && (
            <div className="flex flex-col items-center justify-center p-xl border-2 border-dashed border-outline-variant rounded-xl text-center">
              <span className="material-symbols-outlined text-[48px] text-outline-variant mb-md">perm_media</span>
              <h3 className="text-h3 font-h3 text-on-background">No media yet</h3>
              <p className="text-body-md text-on-surface-variant max-w-sm mb-lg mt-sm">
                {mimeFilter !== 'all'
                  ? `No ${MIME_FILTERS.find((f) => f.value === mimeFilter)?.label} files found.`
                  : 'Upload images (JPEG, PNG, GIF, WebP) or SVG files to get started.'}
              </p>
              {mimeFilter === 'all' && (
                <Can permission="media:create">
                  <Button variant="primary" icon="upload" onClick={() => fileInputRef.current?.click()}>
                    Upload Files
                  </Button>
                </Can>
              )}
            </div>
          )}

          {/* ── Grid ── */}
          {!loading && media.length > 0 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-md">
                {media.map((item) => (
                  <MediaCard
                    key={item.id}
                    item={item}
                    onDelete={() => openDeleteModal(item.id)}
                    onOpen={() => setInfoTarget(item)}
                  />
                ))}
              </div>

              {/* ── Pagination ── */}
              {totalPages > 1 && (
                <div className="mt-xl flex items-center justify-center gap-xs">
                  <PaginationButton disabled={page === 1} onClick={() => setPage(1)} title="First page">
                    <span className="material-symbols-outlined">first_page</span>
                  </PaginationButton>
                  <PaginationButton disabled={page === 1} onClick={() => setPage((p) => p - 1)} title="Previous page">
                    <span className="material-symbols-outlined">chevron_left</span>
                  </PaginationButton>

                  <span className="text-body-md text-on-surface-variant px-md">
                    Page {page} of {totalPages}
                  </span>

                  <PaginationButton disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} title="Next page">
                    <span className="material-symbols-outlined">chevron_right</span>
                  </PaginationButton>
                  <PaginationButton disabled={page >= totalPages} onClick={() => setPage(totalPages)} title="Last page">
                    <span className="material-symbols-outlined">last_page</span>
                  </PaginationButton>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {deleteTarget && (
        <DeleteModal
          checkingUsage={deleteTarget.checkingUsage}
          usages={deleteTarget.usages}
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {infoTarget && (
        <MediaInfoModal
          item={infoTarget}
          onClose={() => setInfoTarget(null)}
          onUpdate={(body) => handleUpdate(infoTarget.id, body)}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}

// ─────────────────────────────────────────────
// MediaCard — clickable card opens info modal
// ─────────────────────────────────────────────
function MediaCard({
  item,
  onDelete,
  onOpen,
}: {
  item: MediaItem;
  onDelete: () => void;
  onOpen: () => void;
}) {
  const isSvg = item.mimeType === 'image/svg+xml';
  const fileName = item.key.split('/').pop() ?? item.key;

  return (
    <div
      className="group relative bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={onOpen}
    >
      {/* Thumbnail */}
      <div className="aspect-square bg-surface-container flex items-center justify-center p-sm">
        {isSvg ? (
          <img src={item.url} alt={item.altText ?? fileName} loading="lazy" className="max-w-full max-h-full object-contain" />
        ) : (
          // Grid dùng thumbUrl (≤300KB, đã resize nhỏ) thay vì url gốc để giảm băng thông.
          // Fallback về url gốc cho record cũ chưa có thumb (trước khi có tính năng tối ưu này).
          <img
            src={item.thumbUrl ?? item.url}
            alt={item.altText ?? fileName}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Info */}
      <div className="p-sm">
        <p className="text-label-sm text-on-surface truncate" title={fileName}>{fileName}</p>
        <p className="text-[11px] text-on-surface-variant font-mono truncate">{item.mimeType}</p>
      </div>

      {/* Hover actions — stop propagation so they don't open the modal */}
      <div
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 bg-surface/90 rounded-lg text-on-surface-variant hover:text-primary shadow-sm"
          title="Open in new tab"
        >
          <span className="material-symbols-outlined text-[18px]">open_in_new</span>
        </a>
        <Can permission="media:delete">
          <button
            onClick={onDelete}
            className="p-1.5 bg-surface/90 rounded-lg text-on-surface-variant hover:text-error shadow-sm"
            title="Delete"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </Can>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MediaInfoModal — view metadata + edit name/alt
// ─────────────────────────────────────────────
function MediaInfoModal({
  item,
  onClose,
  onUpdate,
}: {
  item: MediaItem;
  onClose: () => void;
  onUpdate: (body: { name?: string; altText?: string }) => Promise<MediaItem>;
}) {
  const fileName = item.key.split('/').pop() ?? item.key;

  // Split extension so the input shows only the base name (e.g. "my-photo" not "my-photo.webp")
  const lastDot = fileName.lastIndexOf('.');
  const ext = lastDot > 0 ? fileName.slice(lastDot) : '';          // e.g. ".webp"
  const baseName = lastDot > 0 ? fileName.slice(0, lastDot) : fileName;

  const [nameValue, setNameValue] = useState(baseName);
  const [altValue, setAltValue] = useState(item.altText ?? '');
  const [saving, setSaving] = useState(false);

  const isDirty = nameValue !== baseName || altValue !== (item.altText ?? '');

  const handleSave = async () => {
    if (!isDirty) return;
    setSaving(true);
    try {
      const body: { name?: string; altText?: string } = {};
      // Re-attach extension when sending to the API
      if (nameValue !== baseName) body.name = `${nameValue.trim()}${ext}`;
      if (altValue !== (item.altText ?? '')) body.altText = altValue;
      await onUpdate(body);
    } catch {
      // toast already shown by parent
    } finally {
      setSaving(false);
    }
  };

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Close on Escape
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  const isSvg = item.mimeType === 'image/svg+xml';
  const previewSrc = isSvg ? item.url : (item.thumbUrl ?? item.url);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={handleBackdrop}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Wide modal — max-w-4xl to fit 2 columns without scrollbar */}
      <div className="bg-surface rounded-2xl shadow-2xl border border-outline-variant w-full max-w-4xl mx-md overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-xl pt-xl pb-md shrink-0">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary">image_search</span>
            <h2 className="text-title-md font-title-md text-on-surface">File Info</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Two-column body */}
        <div className="flex gap-xl px-xl pb-xl min-h-0">

          {/* ── Left: image preview only — increased width to w-96 ── */}
          <div className="w-96 shrink-0">
            <div className="min-h-[280px] h-full bg-surface-container rounded-xl border border-outline-variant flex items-center justify-center overflow-hidden">
              <img
                src={previewSrc}
                alt={item.altText ?? fileName}
                className={isSvg ? 'max-w-full max-h-full object-contain p-md' : 'w-full h-full object-contain p-xs'}
              />
            </div>
          </div>

          {/* ── Right: metadata + edit fields ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-lg">

            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-x-lg gap-y-sm">
              <MetaRow icon="folder" label="Filename" value={fileName} />
              <MetaRow icon="category" label="Type" value={item.mimeType} mono />
              <MetaRow
                icon="aspect_ratio"
                label="Dimensions"
                value={item.width && item.height ? `${item.width} × ${item.height} px` : '—'}
              />
              <MetaRow icon="data_usage" label="Size" value={formatFileSize(item.fileSize)} />
            </div>

            <div className="border-t border-outline-variant" />

            {/* Edit fields */}
            <div className="space-y-md">
              <h3 className="text-label-lg font-medium text-on-surface">Edit Metadata</h3>

              {/* Name — shows base name without extension; extension is re-appended on save */}
              <div>
                <label className="block text-label-sm text-on-surface-variant mb-xs" htmlFor="media-info-name">
                  Name
                </label>
                <div className="flex items-center gap-xs">
                  <input
                    id="media-info-name"
                    type="text"
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    className="flex-1 min-w-0 bg-surface-container border border-outline-variant rounded-lg px-sm py-xs text-body-md text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                    placeholder="File name..."
                  />
                  {ext && (
                    <span className="shrink-0 text-body-md text-on-surface-variant font-mono">{ext}</span>
                  )}
                </div>
                <p className="text-[11px] text-on-surface-variant mt-xs">
                  Changing the name also renames the file on disk and updates its URL.
                </p>
              </div>

              {/* Alt Text */}
              <div>
                <label className="block text-label-sm text-on-surface-variant mb-xs" htmlFor="media-info-alt">
                  Alt Text
                </label>
                <input
                  id="media-info-alt"
                  type="text"
                  value={altValue}
                  onChange={(e) => setAltValue(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant rounded-lg px-sm py-xs text-body-md text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                  placeholder="Describe the image for accessibility..."
                />
                <p className="text-[11px] text-on-surface-variant mt-xs">
                  Used as the <code className="font-mono bg-surface-container px-0.5 rounded">alt</code> attribute when this image is rendered on the public site.
                </p>
              </div>
            </div>

            {/* Actions pushed to bottom of right column */}
            <div className="flex items-center justify-end gap-sm mt-auto pt-sm border-t border-outline-variant">
              <Button variant="ghost" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Can permission="media:update">
                <Button
                  variant="primary"
                  onClick={handleSave}
                  loading={saving}
                  disabled={!isDirty}
                >
                  Save
                </Button>
              </Can>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MetaRow — single key/value row in info grid
// ─────────────────────────────────────────────
function MetaRow({ icon, label, value, mono = false }: { icon: string; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-on-surface-variant flex items-center gap-1">
        <span className="material-symbols-outlined text-[13px]">{icon}</span>
        {label}
      </span>
      <span className={`text-body-sm text-on-surface truncate ${mono ? 'font-mono' : ''}`} title={value}>
        {value}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// PaginationButton
// ─────────────────────────────────────────────
function PaginationButton({
  children,
  disabled,
  onClick,
  title,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-9 h-9 flex items-center justify-center rounded-lg text-body-md font-medium transition-colors border border-outline-variant bg-surface hover:bg-surface-container-high ${
        disabled ? 'opacity-40 cursor-not-allowed' : ''
      }`}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────
// DeleteModal
// ─────────────────────────────────────────────
function DeleteModal({
  checkingUsage,
  usages,
  loading,
  onConfirm,
  onCancel,
}: {
  checkingUsage: boolean;
  usages: MediaUsageInfo[];
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const inUse = usages.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-surface rounded-xl p-xl shadow-2xl border border-outline-variant w-full max-w-md mx-md">
        {checkingUsage ? (
          <div className="flex items-center gap-sm py-lg text-on-surface-variant">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Checking if the image is currently in use...
          </div>
        ) : (
          <>
            <div className="flex items-center gap-md mb-md">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${inUse ? 'bg-warning/10' : 'bg-error/10'}`}>
                <span className={`material-symbols-outlined ${inUse ? 'text-warning' : 'text-error'}`}>
                  {inUse ? 'warning' : 'delete'}
                </span>
              </div>
              <h3 className="text-h3 font-h3 text-on-surface">
                {inUse ? 'The image is currently in use.' : 'Delete media?'}
              </h3>
            </div>

            {inUse ? (
              <div className="mb-xl">
                <p className="text-body-md text-on-surface-variant mb-sm">
                  The image is currently being used at{' '}
                  {usages.length === 1
                    ? `block ${usages[0].blockType} page ${usages[0].pageTitle}`
                    : `${usages.length} places`}
                  , are you sure you want to delete it? Any data referencing this image in the blocks will be deleted as well.
                </p>
                {usages.length > 1 && (
                  <ul className="text-body-sm text-on-surface-variant list-disc pl-lg space-y-1 max-h-40 overflow-y-auto">
                    {usages.map((u) => (
                      <li key={u.blockId}>
                        block <span className="font-medium text-on-surface">{u.blockType}</span> — page{' '}
                        <span className="font-medium text-on-surface">{u.pageTitle}</span>{' '}
                        <span className="text-[11px]">({u.pageVersionStatus.toLowerCase()})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <p className="text-body-md text-on-surface-variant mb-xl">
                This will permanently delete the file. This action cannot be undone.
              </p>
            )}

            <div className="flex gap-md justify-end">
              <Button variant="ghost" onClick={onCancel} disabled={loading}>Cancel</Button>
              <Button variant="danger" onClick={onConfirm} loading={loading}>
                {inUse ? 'Delete anyway' : 'Delete'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}