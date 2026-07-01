import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ToastContainer, useToast } from '@/components/ui/Toast';
import { pageVersionsApi } from '@/api/page-versions.api';
import type { PageVersionWithCount } from '@/api/page-versions.api';
import { blocksApi } from '@/api/blocks.api';
import type { Block } from '@/types';
import { ApiClientError } from '@/api/client';
import { BlockDataDisplay } from './components/BlockDataDisplay';

const PAGE_SIZE = 5;

const BLOCK_ICON: Record<string, string> = {
  hero: 'view_day',
  'rich-text': 'notes',
  faq: 'help',
};

// ── Block Preview Panel ───────────────────────────────────────────────────────

interface BlockPreviewPanelProps {
  version: PageVersionWithCount | null;
}

function BlockPreviewPanel({ version }: BlockPreviewPanelProps) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!version) {
      setBlocks([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setBlocks([]);
    setCollapsedIds(new Set());

    blocksApi
      .getByVersion(version.id)
      .then((data: Block[]) => {
        if (!cancelled) {
          setBlocks([...data].sort((a, b) => a.orderIndex - b.orderIndex));
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load blocks.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [version?.id]);

  const toggleCollapsed = (blockId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) next.delete(blockId);
      else next.add(blockId);
      return next;
    });
  };

  const allCollapsed = blocks.length > 0 && blocks.every((b) => collapsedIds.has(b.id));
  const toggleAll = () => {
    setCollapsedIds(allCollapsed ? new Set() : new Set(blocks.map((b) => b.id)));
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Panel header — always visible, no close button */}
      <div className="flex items-start justify-between gap-sm px-lg py-md border-b border-outline-variant bg-surface-container shrink-0">
        <div className="min-w-0">
          <p className="text-label-sm text-on-surface-variant uppercase tracking-wide font-semibold mb-0.5">
            Block Preview
          </p>
          {version ? (
            <>
              <p
                className="text-body-sm font-medium text-primary truncate max-w-[260px]"
                title={`/${version.page.slug}`}
              >
                /{version.page.slug}
              </p>
              <p className="text-label-sm text-on-surface-variant mt-0.5">
                {new Date(version.createdAt).toLocaleString('vi-VN')}
              </p>
            </>
          ) : (
            <p className="text-body-sm text-on-surface-variant italic mt-0.5">
              Select a version from the list to preview its blocks
            </p>
          )}
        </div>

        {blocks.length > 0 && (
          <button
            onClick={toggleAll}
            className="shrink-0 flex items-center gap-xs px-sm py-1 rounded-lg border border-outline-variant text-label-sm text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">
              {allCollapsed ? 'unfold_more' : 'unfold_less'}
            </span>
            {allCollapsed ? 'Expand all' : 'Collapse all'}
          </button>
        )}
      </div>

      {/* Panel body */}
      <div className="flex-1 min-h-0 overflow-y-auto px-lg py-md space-y-md">
        {/* No version selected */}
        {!version && (
          <div className="flex flex-col items-center justify-center h-full py-xl text-center">
            <span className="material-symbols-outlined text-[36px] text-outline-variant mb-sm">visibility</span>
            <p className="text-body-sm text-on-surface-variant">No version selected.</p>
            <p className="text-label-sm text-on-surface-variant mt-xs">
              Click "View" on a row to preview its blocks here.
            </p>
          </div>
        )}

        {/* Loading */}
        {version && loading && (
          <div className="flex items-center justify-center py-xl gap-sm text-on-surface-variant">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-body-sm">Loading blocks…</span>
          </div>
        )}

        {/* Error */}
        {version && !loading && error && (
          <div className="rounded-lg bg-error-container/20 border border-error/30 px-md py-sm">
            <p className="text-body-sm text-error">{error}</p>
          </div>
        )}

        {/* Empty */}
        {version && !loading && !error && blocks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-xl text-center">
            <span className="material-symbols-outlined text-[36px] text-outline-variant mb-sm">widgets</span>
            <p className="text-body-sm text-on-surface-variant">No blocks in this version.</p>
          </div>
        )}

        {/* Block cards — collapsible */}
        {version && !loading && !error && blocks.map((block, idx) => {
          const icon = BLOCK_ICON[block.type] ?? 'widgets';
          const isCollapsed = collapsedIds.has(block.id);
          return (
            <div
              key={block.id}
              className="rounded-xl border border-outline-variant overflow-hidden bg-surface shadow-sm"
            >
              {/* Block header — click to collapse/expand */}
              <button
                type="button"
                onClick={() => toggleCollapsed(block.id)}
                aria-expanded={!isCollapsed}
                className={`w-full flex items-center gap-sm px-md py-sm bg-surface-container-low hover:bg-surface-container transition-colors text-left ${
                  !isCollapsed ? 'border-b border-outline-variant' : ''
                }`}
              >
                <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-[14px]">{icon}</span>
                </div>
                <span className="text-label-sm font-bold text-on-surface capitalize flex-1">
                  {block.type.replace('-', ' ')} Block
                </span>
                <span className="text-label-sm text-on-surface-variant">#{idx + 1}</span>
                <span
                  className={`material-symbols-outlined text-[18px] text-on-surface-variant transition-transform shrink-0 ${
                    isCollapsed ? '-rotate-90' : ''
                  }`}
                >
                  expand_more
                </span>
              </button>

              {/* Block data display — read-only */}
              {!isCollapsed && (
                <div className="p-md">
                  <BlockDataDisplay type={block.type} data={block.data} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Panel footer */}
      {version && !loading && !error && blocks.length > 0 && (
        <div className="shrink-0 px-lg py-sm border-t border-outline-variant bg-surface-container/50">
          <p className="text-label-sm text-on-surface-variant">
            {blocks.length} block{blocks.length !== 1 ? 's' : ''} · read-only
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export function VersionArchivePage() {
  const navigate = useNavigate();
  const { toasts, addToast, removeToast } = useToast();

  const [rows, setRows] = useState<PageVersionWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [pendingDelete, setPendingDelete] = useState<PageVersionWithCount | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const [viewingVersion, setViewingVersion] = useState<PageVersionWithCount | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const data = await pageVersionsApi.findArchived();
      setRows(data);
    } catch (err) {
      console.error(err);
      addToast('Unable to load version list. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { setCurrentPage(1); }, [search]);

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setIsDeletingId(pendingDelete.id);
    try {
      await pageVersionsApi.deleteVersion(pendingDelete.id);
      setRows((prev) => prev.filter((r) => r.id !== pendingDelete.id));
      if (viewingVersion?.id === pendingDelete.id) setViewingVersion(null);
      setPendingDelete(null);
      addToast('The archived version has been deleted.', 'info');
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Delete failed.';
      addToast(msg, 'error');
    } finally {
      setIsDeletingId(null);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const filtered = search
    ? rows.filter((r) => r.page.slug.toLowerCase().includes(search.toLowerCase()))
    : rows;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppLayout
      title="Version Archive"
      actions={
        <>
          <Input
            placeholder="Search by page slug…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon="search"
          />
          <Button variant="secondary" icon="refresh" onClick={fetchAll} disabled={loading}>
            Refresh
          </Button>
        </>
      }
    >
      {/* Direct child of AppLayout — padding 32px */}
      <div className='p-xl '>

        {/* Header */}
        {/* <div className="mb-lg">
          <h1 className="text-h3 font-semibold text-on-surface">Version Archive</h1>
          <p className="text-body-sm text-on-surface-variant mt-xs">
            All page versions have been archived. You can view block contents or permanently delete them.
          </p>
        </div> */}

        {/* Table + Panel side-by-side */}
        <div className="flex gap-lg items-start">

          {/* ── Table — fixed 600px ── */}
          <div className="w-[600px] shrink-0 rounded-xl border border-outline-variant overflow-hidden bg-surface">

            {/* Table header: page(125px) · date(1fr) · actions(auto) */}
            <div className="grid grid-cols-[125px_1fr_auto] gap-md px-lg py-sm bg-surface-container border-b border-outline-variant">
              <span className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wide">Page</span>
              <span className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wide">Created Date</span>
              <span className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wide text-right">Actions</span>
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-2xl gap-sm text-on-surface-variant">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-body-sm">Loading...</span>
              </div>
            )}

            {/* Empty */}
            {!loading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-2xl text-center">
                <span className="material-symbols-outlined text-[48px] text-outline-variant mb-md">inventory_2</span>
                <p className="text-body-md font-medium text-on-surface">
                  {search ? 'No version found.' : 'No version has been saved yet.'}
                </p>
                {search && (
                  <p className="text-body-sm text-on-surface-variant mt-xs">Try searching with a different slug.</p>
                )}
              </div>
            )}

            {/* Rows */}
            {!loading && paginated.map((row, idx) => {
              const isActive = viewingVersion?.id === row.id;
              return (
                <div
                  key={row.id}
                  className={`grid grid-cols-[125px_1fr_auto] gap-md px-lg py-md items-center transition-colors ${
                    isActive ? 'bg-primary/5' : ''
                  } ${idx < paginated.length - 1 ? 'border-b border-outline-variant/60' : ''}`}
                >
                  {/* Page slug — fixed 125px, truncate */}
                  <div className="w-[125px] min-w-0">
                    <button
                      onClick={() => navigate(`/pages/${row.page.id}/edit`)}
                      title={`/${row.page.slug}`}
                      className="text-body-sm font-medium text-primary hover:underline text-left truncate block w-full"
                    >
                      /{row.page.slug}
                    </button>
                  </div>

                  {/* Created date */}
                  <span className="text-body-sm text-on-surface">
                    {new Date(row.createdAt).toLocaleString('vi-VN')}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-xs">
                    <Button
                      variant={isActive ? 'primary' : 'secondary'}
                      size="sm"
                      icon="visibility"
                      onClick={() => setViewingVersion(isActive ? null : row)}
                    >
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon="delete"
                      onClick={() => setPendingDelete(row)}
                      loading={isDeletingId === row.id}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Pagination footer */}
            {!loading && filtered.length > 0 && (
              <div className="flex items-center justify-between border-t border-outline-variant px-lg py-sm bg-surface-container/50">
                <span className="text-label-sm text-on-surface-variant">
                  {filtered.length} version{filtered.length !== 1 ? 's' : ''}
                  {' '}&middot;{'  '}page {safePage}/{totalPages}
                </span>

                <div className="flex items-center gap-xs">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="flex items-center justify-center w-8 h-8 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`w-8 h-8 rounded-lg text-label-sm font-medium transition-colors ${
                        p === safePage
                          ? 'bg-primary text-white'
                          : 'border border-outline-variant text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      {p}
                    </button>
                  ))}

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="flex items-center justify-center w-8 h-8 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Block Preview Panel — always rendered, no close button ── */}
          <div className="flex-1 min-w-0 rounded-xl border border-outline-variant bg-surface overflow-hidden flex flex-col h-[662px] min-h-0">
            <BlockPreviewPanel version={viewingVersion} />
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Delete Confirm Dialog */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-surface p-xl shadow-xl">
            <h3 className="text-h4 font-semibold text-on-surface">Delete archived version?</h3>
            <p className="mt-xs text-body-sm text-on-surface-variant">
              Page:{'  '}<span className="font-medium text-on-surface">/{pendingDelete.page.slug}</span>
            </p>
            <p className="text-body-sm text-on-surface-variant">
              Date:{'  '}
              <span className="font-medium text-on-surface">
                {new Date(pendingDelete.createdAt).toLocaleString('vi-VN')}
              </span>
            </p>
            <p className="mt-sm text-body-sm text-error font-medium">
              This action is irreversible. All blocks will be permanently deleted.
            </p>
            <div className="mt-lg flex justify-end gap-sm">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPendingDelete(null)}
                disabled={!!isDeletingId}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmDelete}
                loading={!!isDeletingId}
                disabled={!!isDeletingId}
              >
                {isDeletingId ? 'Deleting…' : 'Delete permanently'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}