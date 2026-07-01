import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { ToastContainer, useToast } from '@/components/ui/Toast';
import { pagesApi } from '@/api/pages.api';
import { pageVersionsApi } from '@/api/page-versions.api';
import { blocksApi } from '@/api/blocks.api';
import { ApiClientError } from '@/api/client';

import { BlockPickerModal } from './BlockPickerModal';
import { BlockSectionCard } from './components/BlockSectionCard';
import { UnsavedChangesModal } from './components/UnsavedChangesModal';
import type { PageDetail, Block, PageVersion } from '@/types';

export function PageEditPage() {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const { toasts, addToast, removeToast } = useToast();

  const [page, setPage] = useState<PageDetail | null>(null);
  const [currentVersion, setCurrentVersion] = useState<PageVersion | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [originalBlocks, setOriginalBlocks] = useState<Block[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [pendingRevertVersion, setPendingRevertVersion] = useState<{ id: string; createdAt: string } | null>(null);
  const [showDiscardDraftConfirm, setShowDiscardDraftConfirm] = useState(false);
  const [isDiscardingDraft, setIsDiscardingDraft] = useState(false);

  // Synchronous ref tracking for React Router blocker evaluation
  const isDirtyRef = useRef(false);
  const updateIsDirty = useCallback((dirty: boolean) => {
    isDirtyRef.current = dirty;
    setIsDirty(dirty);
  }, []);

  // React Router Navigation Blocker
  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }: { currentLocation: { pathname: string }; nextLocation: { pathname: string } }) =>
        isDirtyRef.current && currentLocation.pathname !== nextLocation.pathname,
      []
    )
  );

  // ─── 1. Load Page, Active Version and Blocks ──────────────────────────────
  const initializePage = async () => {
    if (!pageId) return;
    setLoading(true);
    setError(null);
    try {
      const pageData = await pagesApi.getOne(pageId);
      setPage(pageData);

      // 1. Check if there is already an existing DRAFT version
      let activeVersion = await pageVersionsApi.findDraft(pageId);

      // 2. If no DRAFT, load the active PUBLISHED version (or latest version)
      if (!activeVersion) {
        if (pageData.publishedVersion) {
          activeVersion = pageData.publishedVersion;
        } else if (pageData.versions && pageData.versions.length > 0) {
          const v = pageData.versions[0];
          activeVersion = {
            id: v.id,
            status: v.status,
            seoMeta: {},
            createdAt: v.createdAt,
            updatedAt: v.createdAt,
            pageId: pageData.id,
            createdBy: v.createdBy,
          };
        }
      }

      if (!activeVersion) {
        throw new Error('No version found for this page.');
      }

      setCurrentVersion(activeVersion);

      const blocksData = await blocksApi.getByVersion(activeVersion.id);
      const sortedBlocks = [...blocksData].sort((a, b) => a.orderIndex - b.orderIndex);
      setBlocks(sortedBlocks);
      setOriginalBlocks(JSON.parse(JSON.stringify(sortedBlocks)));
      updateIsDirty(false);
    } catch (err) {
      console.error(err);
      const msg = err instanceof ApiClientError ? err.message : 'Initialization failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initializePage();
  }, [pageId]);

  // Helper: Ensures we have a DRAFT version to save to.
  // Returns everything the caller needs WITHOUT mutating React state,
  // so the caller can atomically commit state only after all API calls succeed.
  //
  // Returns:
  //   draft          — the PageVersion to save into
  //   blocksToSave   — final block list with user edits (using draft block IDs)
  //   draftOriginal  — the unedited blocks from DB (for dirty comparison)
  //   wasForked      — true when a new DRAFT was created in this call
  const ensureDraftVersion = async (
  currentUIBlocks: Block[],
): Promise<{
  draft: PageVersion;
  blocksToSave: Block[];
  draftOriginal: Block[];
  wasForked: boolean;
}> => {
  if (!currentVersion || !page) throw new Error('No active version loaded.');

  // Case 1: đang ở DRAFT → dùng luôn, không tạo mới
  if (currentVersion.status === 'DRAFT') {
    return {
      draft: currentVersion,
      blocksToSave: currentUIBlocks,
      draftOriginal: originalBlocks,
      wasForked: false,
    };
  }

  // Case 2: đang ở PUBLISHED → kiểm tra đã có DRAFT chưa
  const existingDraft = await pageVersionsApi.findDraft(page.id);

  if (existingDraft) {
    // Đã có DRAFT → dùng lại, không fork
    const draftBlocksData = await blocksApi.getByVersion(existingDraft.id);
    const draftOriginal = [...draftBlocksData].sort((a, b) => a.orderIndex - b.orderIndex);

    const idToNewDraftBlock = new Map<string, Block>();
    originalBlocks.forEach((origBlock, idx) => {
      if (draftOriginal[idx]) {
        idToNewDraftBlock.set(origBlock.id, draftOriginal[idx]);
      }
    });

    const blocksToSave = currentUIBlocks.map((uiBlock, idx) => {
      const draftBlock = idToNewDraftBlock.get(uiBlock.id);
      if (draftBlock) {
        return { ...draftBlock, data: uiBlock.data, orderIndex: idx };
      }
      return { ...uiBlock, orderIndex: idx };
    });

    return { draft: existingDraft, blocksToSave, draftOriginal, wasForked: false };
  }

  // Case 3: chưa có DRAFT nào → fork từ PUBLISHED (chỉ xảy ra 1 lần duy nhất)
  const newDraft = await pageVersionsApi.fork(currentVersion.id);

  const draftBlocksData = await blocksApi.getByVersion(newDraft.id);
  const draftOriginal = [...draftBlocksData].sort((a, b) => a.orderIndex - b.orderIndex);

  const idToNewDraftBlock = new Map<string, Block>();
  originalBlocks.forEach((origBlock, idx) => {
    if (draftOriginal[idx]) {
      idToNewDraftBlock.set(origBlock.id, draftOriginal[idx]);
    }
  });

  const blocksToSave = currentUIBlocks.map((uiBlock, idx) => {
    const newDraftBlock = idToNewDraftBlock.get(uiBlock.id);
    if (newDraftBlock) {
      return { ...newDraftBlock, data: uiBlock.data, orderIndex: idx };
    }
    return { ...uiBlock, orderIndex: idx };
  });

  return { draft: newDraft, blocksToSave, draftOriginal, wasForked: true };
};

  // ─── 2. Add Block ──────────────────────────────────────────────────────────
  const handleAddBlock = async (type: string) => {
    try {
      setLoading(true);
      const { draft, blocksToSave } = await ensureDraftVersion(blocks);
      const nextOrder = blocksToSave.length;
      const newBlock = await blocksApi.create({
        pageVersionId: draft.id,
        type,
        orderIndex: nextOrder,
      });

      const updated = [...blocksToSave, newBlock].sort((a, b) => a.orderIndex - b.orderIndex);
      setCurrentVersion(draft);
      setBlocks(updated);
      setOriginalBlocks(JSON.parse(JSON.stringify(updated)));
      setShowPicker(false);
      addToast(`Added new ${type} block`, 'success');
    } catch (err) {
      console.error(err);
      const msg = err instanceof ApiClientError ? err.message : 'Failed to add block.';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─── 3. Delete Block ───────────────────────────────────────────────────────
  const handleDeleteBlock = async (blockId: string) => {
    try {
      setLoading(true);
      const { draft, blocksToSave } = await ensureDraftVersion(blocks);

      const uiIndex = blocks.findIndex((b) => b.id === blockId);
      if (uiIndex === -1) return;

      const draftBlockId = blocksToSave[uiIndex]?.id ?? blockId;
      await blocksApi.remove(draftBlockId);

      const filtered = blocksToSave.filter((_, idx) => idx !== uiIndex);
      const reassigned = filtered.map((b, idx) => ({ ...b, orderIndex: idx }));

      if (reassigned.length > 0) {
        await blocksApi.reorder(reassigned.map((b) => ({ id: b.id, orderIndex: b.orderIndex })));
      }

      setCurrentVersion(draft);
      setBlocks(reassigned);
      setOriginalBlocks(JSON.parse(JSON.stringify(reassigned)));
      updateIsDirty(false);
      addToast('Block deleted successfully', 'info');
    } catch (err) {
      console.error(err);
      const msg = err instanceof ApiClientError ? err.message : 'Failed to delete block.';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─── 4. Reorder Blocks ─────────────────────────────────────────────────────
  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;

    const list = [...blocks];
    [list[index], list[targetIndex]] = [list[targetIndex], list[index]];
    const reassigned = list.map((b, idx) => ({ ...b, orderIndex: idx }));
    setBlocks(reassigned);
    updateIsDirty(true);
  };

  // ─── 5. Update Block Data Locally ──────────────────────────────────────────
  const updateBlockData = (blockId: string, updatedData: any) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, data: updatedData } : b))
    );
    updateIsDirty(true);
  };

  // ─── 6. Save Core Logic ────────────────────────────────────────────────────
  const saveAllChanges = async (): Promise<{ ok: boolean; versionId?: string }> => {
    setSaving(true);
    let wasForked = false;
    let newDraft: PageVersion | null = null;

    try {
      const {
        draft,
        blocksToSave,
        draftOriginal,
        wasForked: forked,
      } = await ensureDraftVersion(blocks);

      wasForked = forked;
      newDraft = draft;

      const promises: Promise<any>[] = [];

      // A. Save reorder if order changed
      const orderChanged = blocksToSave.some((b, idx) => b.id !== draftOriginal[idx]?.id);
      if (orderChanged) {
        const orderPayload = blocksToSave.map((b, idx) => ({ id: b.id, orderIndex: idx }));
        promises.push(blocksApi.reorder(orderPayload));
      }

      // B. Save data updates for modified blocks
      // Compare against draftOriginal (NOT the React state `originalBlocks` which may be stale)
      for (const block of blocksToSave) {
        const original = draftOriginal.find((ob) => ob.id === block.id);
        if (!original || JSON.stringify(original.data) !== JSON.stringify(block.data)) {
          promises.push(blocksApi.update(block.id, { data: block.data }));
        }
      }

      await Promise.all(promises);

      // ─── All API calls succeeded: now commit state atomically ───────────────
      // Reload blocks from DB to get the definitive state
      const freshBlocks = await blocksApi.getByVersion(draft.id);
      const sortedFresh = [...freshBlocks].sort((a, b) => a.orderIndex - b.orderIndex);

      setCurrentVersion(draft);                               // switch to draft version
      setBlocks(sortedFresh);                                // sync blocks
      setOriginalBlocks(JSON.parse(JSON.stringify(sortedFresh))); // reset baseline
      updateIsDirty(false);
      addToast('Draft saved successfully!', 'success');
      return { ok: true, versionId: draft.id };
    } catch (err) {
      console.error(err);

      // ─── Cleanup orphan draft if fork succeeded but patches failed ──────────
      if (wasForked && newDraft) {
        try {
          await pageVersionsApi.deleteDraft(newDraft.id);
          // currentVersion stays as PUBLISHED — user can retry cleanly
        } catch (cleanupErr) {
          console.warn('Could not clean up orphan draft:', cleanupErr);
        }
      }

      let msg = 'Failed to save changes.';
      if (err instanceof ApiClientError) {
        // Show detail from backend validation response
        const detail = (err.data as any);
        if (Array.isArray(detail?.message)) {
          msg = detail.message.join(', ');
        } else if (typeof detail?.message === 'string') {
          msg = detail.message;
        } else {
          msg = err.message;
        }
      }
      addToast(msg, 'error');
      return { ok: false };
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    saveAllChanges();
  };

  // const handleDiscard = () => {
  //   setBlocks(JSON.parse(JSON.stringify(originalBlocks)));
  //   updateIsDirty(false);
  //   addToast('Unsaved changes discarded', 'info');
  // };

  // ─── 7. Publish Action ─────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!page || !currentVersion) return;
    setPublishing(true);
    try {
      let versionIdToPublish = currentVersion.id;

      // If there are unsaved edits, save them to draft first
      if (isDirty) {
        const result = await saveAllChanges();
        if (!result.ok) return;
        if (result.versionId) versionIdToPublish = result.versionId;
      }

      await pagesApi.publish(page.id, versionIdToPublish);
      addToast('Page published live to public website successfully!', 'success');
      await initializePage();
    } catch (err) {
      console.error(err);
      const msg = err instanceof ApiClientError ? err.message : 'Failed to publish page.';
      addToast(msg, 'error');
    } finally {
      setPublishing(false);
    }
  };

  // ─── 8. Revert to Published Version ───────────────────────────────────────
  const handleRevertClick = (version: { id: string; createdAt: string }) => {
    setPendingRevertVersion(version);
  };

  const handleConfirmRevert = async () => {
    if (!pendingRevertVersion) return;
    setIsReverting(true);
    try {
      await pageVersionsApi.revert(pendingRevertVersion.id);
      setPendingRevertVersion(null);
      setShowHistory(false);
      await initializePage();
      addToast('Đã revert về version cũ. Kiểm tra lại và Publish khi sẵn sàng.', 'success');
    } catch (err) {
      console.error(err);
      const msg = err instanceof ApiClientError ? err.message : 'Revert thất bại. Vui lòng thử lại.';
      addToast(msg, 'error');
    } finally {
      setIsReverting(false);
    }
  };

  // ─── Discard Draft → revert về Published hiện tại ───────────────────────────
  const handleConfirmDiscardDraft = async () => {
    if (!currentVersion || currentVersion.status !== 'DRAFT') return;
    setIsDiscardingDraft(true);
    try {
      await pageVersionsApi.deleteDraft(currentVersion.id);
      setShowDiscardDraftConfirm(false);
      await initializePage();
      addToast('Đã quay về bản đang publish.', 'success');
    } catch (err) {
      console.error(err);
      const msg = err instanceof ApiClientError ? err.message : 'Thao tác thất bại. Vui lòng thử lại.';
      addToast(msg, 'error');
    } finally {
      setIsDiscardingDraft(false);
    }
  };

  // ─── 9. Blocker Actions ────────────────────────────────────────────────────
  const handleSaveAndLeave = async () => {
    if (blocker.state !== 'blocked') return;
    const result = await saveAllChanges();
    if (result.ok) {
      blocker.proceed();
    }
  };

  const handleDiscardAndLeave = () => {
    if (blocker.state !== 'blocked') return;
    updateIsDirty(false);
    blocker.proceed();
  };

  const handleCancelNavigation = () => {
    if (blocker.state !== 'blocked') return;
    blocker.reset();
  };

  // ─── Render Loading / Error States ────────────────────────────────────────
  if (loading && blocks.length === 0) {
    return (
      <AppLayout title="Content Manager" >
        <div className="flex items-center justify-center h-[calc(100vh-64px)] text-on-surface-variant gap-sm">
          <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading Page Editor…
        </div>
      </AppLayout>
    );
  }

  if (error || !page) {
    return (
      <AppLayout title="Content Manager" breadcrumb={{ label: 'Pages', highlight: 'Error' }}>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] text-on-surface-variant gap-md">
          <span className="material-symbols-outlined text-[48px] text-error">error</span>
          <p className="text-body-md text-error">{error ?? 'Page not found'}</p>
          <Button variant="secondary" onClick={() => navigate('/content-manager')}>
            Back to Pages
          </Button>
        </div>
      </AppLayout>
    );
  }

  const isDraftStatus = currentVersion?.status === 'DRAFT';

  return (
    <AppLayout
      title="Content Manager"
      // breadcrumb={{
        // label: 'Pages',
        // highlight: `/${page.slug} [${currentVersion?.status ?? 'PUBLISHED'}]`,
      // }}
      actions={
        <div className="flex items-center gap-sm">
          <Button variant="ghost" icon="arrow_back" onClick={() => navigate('/content-manager')}>
            Back
          </Button>
          <Button
            variant="ghost"
            icon="history"
            onClick={() => setShowHistory((v) => !v)}
          >
            History
          </Button>
          {isDraftStatus && page?.publishedVersion && (
            <Button
              variant="ghost"
              icon="undo"
              onClick={() => setShowDiscardDraftConfirm(true)}
              disabled={isDiscardingDraft || saving || publishing}
            >
              Revert to Published
            </Button>
          )}
          <Button
            variant="secondary"
            icon="save"
            onClick={handleSave}
            disabled={!isDirty || saving || publishing}
            loading={saving}
          >
            Save Draft
          </Button>
          <Button
            variant="primary"
            icon="publish"
            onClick={handlePublish}
            disabled={saving || publishing || (!isDraftStatus && !isDirty)}
            loading={publishing}
          >
            Publish Live
          </Button>
        </div>
      }
    >
      <div className="p-xl">
        <div className="max-w-max_content_width mx-auto space-y-lg">
          
          {/* Header */}
          <div className="flex justify-between items-center mb-md">
            <div>
              <div className="flex items-center gap-sm">
                <h1 className="text-h1 font-h1 text-on-background">Page Sections</h1>
                <span
                  className={`px-sm py-0.5 rounded-full text-label-sm font-bold ${
                    isDraftStatus
                      ? 'bg-outline-variant/30 text-on-surface-variant'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  {isDraftStatus ? 'DRAFT' : 'PUBLISHED'}
                </span>
              </div>
              <p className="text-body-md text-on-surface-variant mt-xs">
                Edit block contents and manage the layout structure of page{' '}
                <code className="font-mono bg-surface-container px-xs rounded">/{page.slug}</code>
              </p>
            </div>
            
            <Button
              variant="primary"
              icon="add_box"
              size="md"
              onClick={() => setShowPicker(true)}
            >
              Add Block
            </Button>
          </div>

          {/* Blocks List */}
          {blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-xl text-center border-2 border-dashed border-outline-variant rounded-xl bg-surface">
              <span className="material-symbols-outlined text-[48px] text-outline-variant mb-md">
                view_stream
              </span>
              <h4 className="text-h4 text-on-surface">No blocks in this page version</h4>
              <p className="text-body-md text-on-surface-variant max-w-sm mb-lg mt-sm">
                Add blocks using the button below to start building the page layout.
              </p>
              <Button variant="secondary" icon="add" onClick={() => setShowPicker(true)}>
                Add First Block
              </Button>
            </div>
          ) : (
            <div className="space-y-lg">
              {blocks.map((block, idx) => (
                <BlockSectionCard
                  key={block.id}
                  block={block}
                  index={idx}
                  totalBlocks={blocks.length}
                  onMove={(dir) => moveBlock(idx, dir)}
                  onDelete={() => handleDeleteBlock(block.id)}
                  onUpdateData={(newData) => updateBlockData(block.id, newData)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Block selection modal */}
      {showPicker && (
        <BlockPickerModal
          onSelect={handleAddBlock}
          onCancel={() => setShowPicker(false)}
        />
      )}

      {/* Navigation Blocker Modal */}
      <UnsavedChangesModal
        isOpen={blocker.state === 'blocked'}
        saving={saving}
        onSaveAndLeave={handleSaveAndLeave}
        onDiscardAndLeave={handleDiscardAndLeave}
        onCancel={handleCancelNavigation}
      />

      {/* Toasts Feedback */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Discard Draft → Revert to Published Dialog */}
      {showDiscardDraftConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-surface p-xl shadow-xl">
            <h3 className="text-h4 font-semibold text-on-surface">Back to published version ?</h3>
            <p className="mt-xs text-body-sm text-on-surface-variant">
              The current draft will be permanently deleted. The page will now display the published content.
            </p>
            {isDirty && (
              <div className="mt-md rounded-lg border border-warning/40 bg-warning/10 px-md py-sm text-body-sm text-on-surface">
                ⚠️ If you have unsaved changes, those changes will also be lost.
              </div>
            )}
            <div className="mt-lg flex justify-end gap-sm">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowDiscardDraftConfirm(false)}
                disabled={isDiscardingDraft}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmDiscardDraft}
                loading={isDiscardingDraft}
                disabled={isDiscardingDraft}
              >
                {isDiscardingDraft ? 'Processing...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Panel */}
      {showHistory && (
        <div className="fixed inset-y-0 right-0 z-40 flex w-80 flex-col border-l border-outline-variant bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-outline-variant px-lg py-md">
            <h2 className="text-h4 font-semibold text-on-surface">Version History</h2>
            <button
              onClick={() => setShowHistory(false)}
              className="rounded-full p-xs text-on-surface-variant hover:bg-surface-container"
              aria-label="Close history"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-md space-y-sm">
            {(!page.versions || page.versions.length === 0) && (
              <p className="text-body-sm text-on-surface-variant px-xs">
                No version has been published yet.
              </p>
            )}
            {(page.versions ?? [])
              .filter((v) => v.status === 'ARCHIVED')
              .map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container px-md py-sm"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-body-sm font-medium text-on-surface truncate">
                      {new Date(v.createdAt).toLocaleString('vi-VN')}
                    </span>
                    <span className="text-label-sm text-primary font-semibold">ARCHIVED</span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleRevertClick(v)}
                    disabled={isReverting}
                  >
                    Revert
                  </Button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Backdrop for history panel */}
      {showHistory && (
        <div
          className="fixed inset-0 z-30 bg-black/20"
          onClick={() => setShowHistory(false)}
        />
      )}

      {/* Revert Confirm Dialog */}
      {pendingRevertVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-surface p-xl shadow-xl">
            <h3 className="text-h4 font-semibold text-on-surface">Revert to this version ?</h3>
            <p className="mt-xs text-body-sm text-on-surface-variant">
              Version:{' '}
              <span className="font-medium text-on-surface">
                {new Date(pendingRevertVersion.createdAt).toLocaleString('vi-VN')}
              </span>
            </p>

            {/* Warning message tùy trạng thái draft */}
            <div className="mt-md rounded-lg border border-warning/40 bg-warning/10 px-md py-sm text-body-sm text-on-surface">
              {isDirty
                ? '⚠️ You have unsaved changes. Reverting will erase all of those changes.'
                : isDraftStatus
                  ? '⚠️ The current DRAFT will be deleted and replaced with a copy of this version.'
                  : 'A new DRAFT will be created from this version for you to review before publishing.'
              }
            </div>

            <div className="mt-lg flex justify-end gap-sm">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPendingRevertVersion(null)}
                disabled={isReverting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmRevert}
                loading={isReverting}
                disabled={isReverting}
              >
                {isReverting ? 'Revering...' : 'Confirm Revert'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}