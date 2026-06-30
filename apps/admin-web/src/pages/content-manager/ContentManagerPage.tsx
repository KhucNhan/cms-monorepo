import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { usePages } from '@/hooks/usePages';
import { CreatePageModal } from '@/pages/content-manager/components/CreatePageModal';
import type { Page, VersionStatus } from '@/types';

// ─── Component ────────────────────────────────────────────────────────────────

export function ContentManagerPage() {
  const navigate    = useNavigate();
  const [page, setPage]       = useState(1);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { pages, total, loading, error, refetch, deletePage } = usePages({
    page,
    pageSize: 20,
    search: search.trim() || undefined,
  });

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deletePage(deleteId);
    setDeleteId(null);
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <AppLayout
      title="Content Manager"
      actions={
        <>
          <SearchInput
            placeholder="Search pages..."
            value={search}
            onChange={handleSearchChange}
          />
          <Button variant="primary" icon="add" size="md" onClick={() => setIsCreateModalOpen(true)}>
            New Page
          </Button>
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
                      {['Slug', 'Status', 'Versions', 'Last Updated', 'Actions'].map((h, i) => (
                        <th
                          key={h}
                          className={`p-md text-label-md font-label-md text-on-surface-variant uppercase tracking-wider ${i === 4 ? 'text-right' : 'text-left'}`}
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
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-surface-container-low border-t border-outline-variant p-md flex items-center justify-between">
                <p className="text-body-md text-on-surface-variant">
                  Showing{' '}
                  <span className="font-bold">{(page - 1) * 20 + 1}</span> to{' '}
                  <span className="font-bold">{Math.min(page * 20, total)}</span> of{' '}
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
  DRAFT:     { label: 'Draft',     classes: 'bg-outline-variant/30 text-on-surface-variant' },
  ARCHIVED:  { label: 'Archived',  classes: 'bg-surface-container-high text-outline' },
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
  const status      = page.publishedVersion?.status ?? 'DRAFT';
  const updatedAt   = page.publishedVersion?.updatedAt
    ? new Date(page.publishedVersion.updatedAt).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : '—';
  const versionCount = page._count?.versions ?? 0;
  const cfg          = STATUS_CONFIG[status as VersionStatus] ?? STATUS_CONFIG.DRAFT;

  return (
    <tr className="hover:bg-primary/5 transition-colors group">
      {/* Slug */}
      <td className="p-md">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-on-surface-variant text-[18px]">article</span>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-on-background truncate max-w-[280px]">
              /{page.slug}
            </p>
            {/* <p className="text-[11px] text-on-surface-variant font-mono">{page.id.slice(0, 8)}…</p> */}
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
        <div className="flex items-center justify-end gap-xs opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
            title="Edit page"
          >
            <span className="material-symbols-outlined text-[20px]">edit</span>
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-all"
            title="Delete page"
          >
            <span className="material-symbols-outlined text-[20px]">delete</span>
          </button>
        </div>
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
