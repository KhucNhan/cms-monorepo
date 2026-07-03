import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { usePages } from '@/hooks/usePages';
import { CreatePageModal } from '@/pages/content-management/components/CreatePageModal';
import { Can } from '@/components/Can';
import type { Page, VersionStatus } from '@/types';

// ─── Component ────────────────────────────────────────────────────────────────

export function ContentManagementPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const PAGE_SIZE = 5;

  // Debounce 300ms trước khi bắn request search — tránh gọi API mỗi lần gõ 1 ký tự
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset về trang 1 mỗi khi search thay đổi để tránh page hiện tại vượt quá totalPages mới
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Search thật ở server (BE đã hỗ trợ `search` trong listPagesSchema + PagesService.findAll),
  // không tự filter/fetch-all ở client — pageSize luôn hợp lệ (≤ 100 theo Zod schema).
  const { pages, total, loading, error, refetch, deletePage } = usePages({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
  });

  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setIsCreateModalOpen(true);
    }
  }, [searchParams]);

  const handleDelete = async () => {
    if (!deleteId) return;
    await deletePage(deleteId);
    setDeleteId(null);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <AppLayout
      title="Content Management"
      actions={
        <>
          <SearchInput
            placeholder="Search pages..."
            value={search}
            onChange={setSearch}
          />
          <Can permission="page:create">
            <Button variant="primary" icon="add" size="md" onClick={() => setIsCreateModalOpen(true)}>
              New Page
            </Button>
          </Can>
        </>
      }
    >
      <div className="p-xl">
        <div className="max-w-max_content_width mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-xl">
            <div>
              <h1 className="text-h1 font-h1 text-on-background">Pages</h1>
              <p className="text-body-md text-on-surface-variant mt-xs">
                Manage and publish your site pages.
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

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center p-xl text-on-surface-variant gap-sm">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading pages…
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="flex items-center gap-sm p-md rounded-xl bg-error/10 border border-error/20 text-error text-body-md mb-lg">
              <span className="material-symbols-outlined">error</span>
              {error}
              <button onClick={refetch} className="ml-auto underline text-label-md">Retry</button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && pages.length === 0 && (
            <EmptyState onCreate={() => setIsCreateModalOpen(true)} />
          )}

          {/* Table */}
          {!loading && pages.length > 0 && (
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant">
                      {['SEO Title', 'SEO Description', 'Slug', 'Status', 'Versions', 'Last Updated', 'Action'].map((h, i, arr) => (
                        <th
                          key={h}
                          className={`p-md text-label-md font-label-md text-on-surface-variant uppercase tracking-wider ${i === arr.length - 1 ? 'text-right' : 'text-left'}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {pages.map((p) => (
                      <PageRow
                        key={p.id}
                        page={p}
                        onEdit={() => navigate(`/pages/${p.id}/edit`)}
                        onDelete={() => setDeleteId(p.id)}
                      />
                    ))}
                    {pages.length < PAGE_SIZE &&
                      Array.from({ length: PAGE_SIZE - pages.length }, (_, i) => (
                        <FillerRow key={`filler-${i}`} />
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-surface-container-low border-t border-outline-variant p-md flex items-center justify-between">
                <p className="text-body-md text-on-surface-variant">
                  Showing{' '}
                  <span className="font-bold">{(page - 1) * PAGE_SIZE + 1}</span> to{' '}
                  <span className="font-bold">{Math.min(page * PAGE_SIZE, total)}</span> of{' '}
                  <span className="font-bold">{total}</span> pages
                </p>
                <div className="flex items-center gap-xs">
                  <PaginationButton disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                    <span className="material-symbols-outlined">chevron_left</span>
                  </PaginationButton>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .slice(0, 5)
                    .map((p) => (
                      <PaginationButton key={p} active={p === page} onClick={() => setPage(p)}>
                        {p}
                      </PaginationButton>
                    ))}
                  <PaginationButton
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </PaginationButton>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete modal */}
      {deleteId && (
        <DeleteModal
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {isCreateModalOpen && (
        <CreatePageModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={(created) => {
            setIsCreateModalOpen(false);
            navigate(`/pages/${created.id}/edit`);
          }}
        />
      )}
    </AppLayout>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<VersionStatus, { label: string; classes: string }> = {
  PUBLISHED: { label: 'Published', classes: 'bg-primary/10 text-primary' },
  DRAFT: { label: 'Draft', classes: 'bg-outline-variant/30 text-on-surface-variant' },
  ARCHIVED: { label: 'Archived', classes: 'bg-surface-container-high text-outline' },
};

function PageRow({
  page,
  onEdit,
  onDelete,
}: {
  page: Page;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const status = page.publishedVersion?.status ?? 'DRAFT';
  const updatedAt = page.publishedVersion?.updatedAt
    ? new Date(page.publishedVersion.updatedAt).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
    : '—';
  const versionCount = page._count?.versions ?? 0;
  const cfg = STATUS_CONFIG[status as VersionStatus] ?? STATUS_CONFIG.DRAFT;

  const seoMeta = (page.publishedVersion as unknown as { seoMeta?: { title?: string; description?: string } } | undefined)?.seoMeta;
  const seoTitle = seoMeta?.title ?? '—';
  const seoDescription = seoMeta?.description ?? '—';

  return (
    <tr
      onClick={onEdit}
      className="hover:bg-primary/5 transition-colors group cursor-pointer"
    >
      {/* SEO Title */}
      <td className="p-md text-body-md text-on-surface-variant max-w-[200px] truncate">
        {seoTitle}
      </td>

      {/* SEO Description */}
      <td className="p-md text-body-md text-on-surface-variant max-w-[260px] truncate">
        {seoDescription}
      </td>

      {/* Slug */}
      <td className="p-md">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-on-surface-variant text-[18px]">article</span>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-on-background truncate max-w-[280px]">
              /{page.slug}
            </p>
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="p-md">
        <span className={`inline-flex items-center gap-xs px-sm py-1 rounded-full text-label-md font-label-md ${cfg.classes}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
          {cfg.label}
        </span>
      </td>

      {/* Versions */}
      <td className="p-md text-body-md text-on-surface-variant">{versionCount}</td>

      {/* Updated */}
      <td className="p-md text-body-md text-on-surface-variant">{updatedAt}</td>

      {/* Actions */}
      <td className="p-md text-right">
        <div className="flex items-center justify-end gap-xs">
          <Can permission="page:delete">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-all"
              title="Delete page"
            >
              <span className="material-symbols-outlined text-[20px]">delete</span>
            </button>
          </Can>
        </div>
      </td>
    </tr>
  );
}

function FillerRow() {
  return (
    <tr aria-hidden="true" className="pointer-events-none h-[74.133px]">
      <td className="p-md" colSpan={7}>
        <span className="invisible text-body-md">&nbsp;</span>
      </td>
    </tr>
  );
}

function PaginationButton({
  children, active, disabled, onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-10 h-10 flex items-center justify-center rounded-lg text-body-md font-medium transition-colors
        ${active ? 'bg-primary text-on-primary font-bold' : 'border border-outline-variant bg-surface hover:bg-surface-container-high'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
      `}
    >
      {children}
    </button>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-xl border-2 border-dashed border-outline-variant rounded-xl text-center">
      <span className="material-symbols-outlined text-[48px] text-outline-variant mb-md">article</span>
      <h3 className="text-h3 font-h3 text-on-background">No pages yet</h3>
      <p className="text-body-md text-on-surface-variant max-w-sm mb-lg mt-sm">
        Create your first page to get started with your CMS.
      </p>
      <Button variant="primary" icon="add" onClick={onCreate}>Create New Page</Button>
    </div>
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
          <h3 className="text-h3 font-h3 text-on-surface">Delete page?</h3>
        </div>
        <p className="text-body-md text-on-surface-variant mb-xl">
          This will permanently delete the page and all its versions. This action cannot be undone.
        </p>
        <div className="flex gap-md justify-end">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm}>Delete</Button>
        </div>
      </div>
    </div>
  );
}