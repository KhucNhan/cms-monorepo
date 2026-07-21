import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import { useAppLayoutHeader } from '@/context/AppLayoutContext';
import { Button } from '@/components/ui/Button';
import { ToastContainer, useToast } from '@/components/ui/Toast';
import { pagesApi } from '@/api/pages.api';
import { pageVersionsApi } from '@/api/page-versions.api';
import { blocksApi } from '@/api/blocks.api';
import { templatesApi } from '@/api/templates.api';
import { ApiClientError } from '@/api/client';
import { invalidatePagesCache } from '@/hooks/usePages';
import { BlockPickerModal } from './BlockPickerModal';
import { BlockSectionCard } from './components/BlockSectionCard';
import { UnsavedChangesModal } from './components/UnsavedChangesModal';
import { Can } from '@/components/Can';
import type { PageDetail, Block, PageVersion, Template } from '@/types';

// Placeholder block types — block dùng làm placeholder trong template, không phải outlet block tự do
const PLACEHOLDER_TYPES = new Set(['hero', 'faq']);

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
  const [pendingDeleteVersion, setPendingDeleteVersion] = useState<{ id: string; createdAt: string; status: string } | null>(null);
  const [isDeletingVersion, setIsDeletingVersion] = useState(false);
  const [draggedBlockIndex, setDraggedBlockIndex] = useState<number | null>(null);
  const [dragOverBlockIndex, setDragOverBlockIndex] = useState<number | null>(null);

  // ─── Template state ────────────────────────────────────────────────────────
  const [pageTemplate, setPageTemplate] = useState<Template | null>(null);
  const [isTemplateOpen, setIsTemplateOpen] = useState(true);

  // ─── Page Info (title + slug) & SEO (title/description) — 2 section riêng ──
  const [titleInput, setTitleInput] = useState('');
  const [slugInput, setSlugInput] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  // Baseline snapshot to detect changes when saving alongside blocks
  const [originalTitle, setOriginalTitle] = useState('');
  const [originalSlug, setOriginalSlug] = useState('');
  const [originalMetaTitle, setOriginalMetaTitle] = useState('');
  const [originalMetaDescription, setOriginalMetaDescription] = useState('');

  // Collapse state cho 2 section — mặc định mở cả hai
  const [isPageInfoOpen, setIsPageInfoOpen] = useState(true);
  const [isSeoOpen, setIsSeoOpen] = useState(true);
  const [isBlocksOpen, setIsBlocksOpen] = useState(true);

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

      // Sync editable page-info fields with the freshly loaded data
      const seoMeta = (activeVersion.seoMeta ?? {}) as { title?: string; description?: string };
      setTitleInput(pageData.title ?? '');
      setSlugInput(pageData.slug);
      setMetaTitle(seoMeta.title ?? '');
      setMetaDescription(seoMeta.description ?? '');
      setOriginalTitle(pageData.title ?? '');
      setOriginalSlug(pageData.slug);
      setOriginalMetaTitle(seoMeta.title ?? '');
      setOriginalMetaDescription(seoMeta.description ?? '');

      // Load template nếu page có templateId
      if (pageData.templateId) {
        try {
          const template = await templatesApi.getOne(pageData.templateId);
          setPageTemplate(template);
        } catch (templateErr) {
          console.warn('Failed to load page template:', templateErr);
          setPageTemplate(null);
        }
      } else {
        setPageTemplate(null);
      }
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

  // ─── 4. Reorder Blocks (drag & drop) ───────────────────────────────────────
  const reorderBlocks = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    if (fromIndex >= blocks.length || toIndex >= blocks.length) return;

    const list = [...blocks];
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
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
    if (!page) return { ok: false };
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

      // C. Save title / slug (Page-level) và SEO title/description (PageVersion-level) nếu đổi
      const trimmedTitle = titleInput.trim();
      const trimmedSlug = slugInput.trim();
      const pagePatch: { title?: string; slug?: string } = {};
      if (trimmedTitle !== originalTitle) pagePatch.title = trimmedTitle;
      if (trimmedSlug && trimmedSlug !== page.slug) pagePatch.slug = trimmedSlug;
      if (Object.keys(pagePatch).length > 0) {
        await pagesApi.update(page.id, pagePatch);
      }

      const metaChanged =
        metaTitle.trim() !== originalMetaTitle || metaDescription.trim() !== originalMetaDescription;
      if (metaChanged) {
        await pageVersionsApi.updateSeoMeta(draft.id, {
          title: metaTitle.trim(),
          description: metaDescription.trim(),
        });
      }

      // ─── All API calls succeeded: now commit state atomically ───────────────
      // Reload blocks from DB to get the definitive state
      const freshBlocks = await blocksApi.getByVersion(draft.id);
      const sortedFresh = [...freshBlocks].sort((a, b) => a.orderIndex - b.orderIndex);

      setCurrentVersion(draft);                               // switch to draft version
      setBlocks(sortedFresh);                                // sync blocks
      setOriginalBlocks(JSON.parse(JSON.stringify(sortedFresh))); // reset baseline
      setOriginalTitle(trimmedTitle);
      setOriginalSlug(trimmedSlug || originalSlug); // reset baseline
      setOriginalMetaTitle(metaTitle.trim());
      setOriginalMetaDescription(metaDescription.trim());
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
      invalidatePagesCache();
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
      invalidatePagesCache();
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

  // ─── 8b. Delete a DRAFT or ARCHIVED version ────────────────────────────────
  const handleDeleteVersionClick = (version: { id: string; createdAt: string; status: string }) => {
    setPendingDeleteVersion(version);
  };

  const handleConfirmDeleteVersion = async () => {
    if (!pendingDeleteVersion) return;
    setIsDeletingVersion(true);
    try {
      await pageVersionsApi.deleteVersion(pendingDeleteVersion.id);
      invalidatePagesCache();
      setPendingDeleteVersion(null);
      await initializePage();
      addToast('Version deleted successfully.', 'info');
    } catch (err) {
      console.error(err);
      const msg = err instanceof ApiClientError ? err.message : 'Failed to delete version. Please try again.';
      addToast(msg, 'error');
    } finally {
      setIsDeletingVersion(false);
    }
  };

  // ─── Discard Draft → revert về Published hiện tại ───────────────────────────
  const handleConfirmDiscardDraft = async () => {
    if (!currentVersion || currentVersion.status !== 'DRAFT') return;
    setIsDiscardingDraft(true);
    try {
      await pageVersionsApi.deleteDraft(currentVersion.id);
      invalidatePagesCache();
      setShowDiscardDraftConfirm(false);
      await initializePage();
      addToast('Reverted to the current publication version.', 'success');
    } catch (err) {
      console.error(err);
      const msg = err instanceof ApiClientError ? err.message : 'Revert failed. Please try again.';
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

  // ─── Template-derived computed state ──────────────────────────────────────
  // placeholderBlocks: blocks that match a non-outlet template placeholder (keyed by type)
  // outletBlocks: all other blocks — free-form content zone
  const { placeholderBlocks, outletBlocks } = useMemo(() => {
    if (!pageTemplate || !pageTemplate.placeholders) {
      return { placeholderBlocks: new Map<string, Block>(), outletBlocks: blocks };
    }
    const nonOutletTypes = new Set(
      pageTemplate.placeholders.filter((p) => p.type !== 'content-outlet').map((p) => p.type),
    );
    const implementedMap = new Map<string, Block>();
    const outlet: Block[] = [];
    for (const block of blocks) {
      if (nonOutletTypes.has(block.type) && !implementedMap.has(block.type)) {
        implementedMap.set(block.type, block);
      } else {
        // Orphan placeholder blocks are hidden from outlet (shown as info strip instead)
        if (!PLACEHOLDER_TYPES.has(block.type) || nonOutletTypes.has(block.type)) {
          outlet.push(block);
        }
      }
    }
    return { placeholderBlocks: implementedMap, outletBlocks: outlet };
  }, [blocks, pageTemplate]);

  const isDraftStatus = currentVersion?.status === 'DRAFT';

    useAppLayoutHeader(
    loading && blocks.length === 0
      ? { title: 'Content Management' }
      : error || !page
      ? { title: 'Content Management', breadcrumb: { label: 'Pages', highlight: 'Error' } }
      : {
          title: 'Content Management',
          // breadcrumb={{ label: 'Pages', highlight: `/${page.slug} [...]` }} — giữ comment-out như bản gốc
          actions: (
            <div className="flex items-center gap-sm">
              <Button variant="ghost" icon="arrow_back" onClick={() => navigate('/content-management')}>
                Back
              </Button>
              <Button variant="ghost" icon="history" onClick={() => setShowHistory((v) => !v)}>
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
              <Can permission="page:update">
                <Button
                  variant="secondary"
                  icon="save"
                  onClick={handleSave}
                  disabled={!isDirty || saving || publishing}
                  loading={saving}
                >
                  Save Draft
                </Button>
              </Can>
              <Can permission="page:publish">
                <Button
                  variant="primary"
                  icon="publish"
                  onClick={handlePublish}
                  disabled={saving || publishing || (!isDraftStatus && !isDirty)}
                  loading={publishing}
                >
                  Publish Live
                </Button>
              </Can>
            </div>
          ),
        },
  );

  // ─── Loading ───────────────────────────────────────────────────────────
  if (loading && blocks.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] text-on-surface-variant gap-sm">
        <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading Page Editor…
      </div>
    );
  }

  // ─── Error ─────────────────────────────────────────────────────────────
  if (error || !page) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] text-on-surface-variant gap-md">
        <span className="material-symbols-outlined text-[48px] text-error">error</span>
        <p className="text-body-md text-error">{error ?? 'Page not found'}</p>
        <Button variant="secondary" onClick={() => navigate('/content-management')}>
          Back to Pages
        </Button>
      </div>
    );
  }

  // ─── Combine DRAFT / PUBLISHED / ARCHIVED into one list for the History panel ──
  // DRAFT and PUBLISHED always float to the top (so the user can see & track
  // where they currently are), ARCHIVED versions follow, newest first.
  const historyVersionsMap = new Map<string, { id: string; status: string; createdAt: string }>();
  (page.versions ?? []).forEach((v) => historyVersionsMap.set(v.id, v));
  if (page.publishedVersion) {
    historyVersionsMap.set(page.publishedVersion.id, {
      id: page.publishedVersion.id,
      status: 'PUBLISHED',
      createdAt: page.publishedVersion.createdAt,
    });
  }
  if (currentVersion?.status === 'DRAFT') {
    historyVersionsMap.set(currentVersion.id, {
      id: currentVersion.id,
      status: 'DRAFT',
      createdAt: currentVersion.createdAt,
    });
  }
  const STATUS_ORDER: Record<string, number> = { DRAFT: 0, PUBLISHED: 1, ARCHIVED: 2 };
  const historyVersions = Array.from(historyVersionsMap.values()).sort((a, b) => {
    const orderDiff = (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3);
    if (orderDiff !== 0) return orderDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <>
      <div className="p-xl">
        <div className="max-w-max_content_width mx-auto space-y-lg">
          
          {/* Header */}
          <div className="flex justify-between items-center mb-md">
            <div className='flex-1'>
              <div className="flex items-center gap-sm">
                <div className='flex items-center gap-sm flex-1'>
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
                {page?.slug && (
                  <Button
                    variant="ghost"
                    icon="open_in_new"
                    onClick={() => {
                      const webUrl = import.meta.env.VITE_WEB_URL ?? 'http://localhost:3000';
                      const slug = page.slug === 'homepage' ? '' : page.slug;
                      window.open(`${webUrl}/${slug}`, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    Open on Public Site
                  </Button>
                )}
              </div>
              <p className="text-body-md text-on-surface-variant mt-xs">
                Edit block contents and manage the layout structure of page{' '}
                <code className="font-mono bg-surface-container px-xs rounded">/{page.slug}</code>
              </p>
            </div>
          </div>

          {/* Section 1: Page Info — title + slug (thuộc Page, không versioned) */}
          <div className="bg-surface rounded-xl border border-outline-variant shadow-sm p-lg flex flex-col gap-md">
            <button
              type="button"
              onClick={() => setIsPageInfoOpen((v) => !v)}
              className="flex items-center justify-between w-full text-left"
              aria-expanded={isPageInfoOpen}
            >
              <h3 className="text-h4 font-semibold text-on-surface">Page Info</h3>
              <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
                {isPageInfoOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {isPageInfoOpen && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <div className="flex flex-col gap-xs">
                  <label className="text-label-md font-bold text-on-surface">Title</label>
                  <input
                    type="text"
                    maxLength={100}
                    value={titleInput}
                    onChange={(e) => {
                      setTitleInput(e.target.value);
                      updateIsDirty(true);
                    }}
                    className="bg-surface border border-outline-variant rounded-lg px-sm py-2 text-body-md focus:border-primary outline-none"
                    placeholder="e.g. Home Page"
                  />
                </div>

                <div className="flex flex-col gap-xs">
                  <label className="text-label-md font-bold text-on-surface">Slug</label>
                  <div className="flex items-center gap-xs">
                    <span className="text-on-surface-variant text-body-md">/</span>
                    <input
                      type="text"
                      value={slugInput}
                      onChange={(e) => {
                        setSlugInput(e.target.value);
                        updateIsDirty(true);
                      }}
                      className="flex-1 bg-surface border border-outline-variant rounded-lg px-sm py-2 text-body-md focus:border-primary outline-none font-mono"
                      placeholder="page-slug"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: SEO Metadata — title/description (thuộc PageVersion, cần Save Draft) */}
          <div className="bg-surface rounded-xl border border-outline-variant shadow-sm p-lg flex flex-col gap-md">
            <button
              type="button"
              onClick={() => setIsSeoOpen((v) => !v)}
              className="flex items-center justify-between w-full text-left"
              aria-expanded={isSeoOpen}
            >
              <h3 className="text-h4 font-semibold text-on-surface">SEO</h3>
              <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
                {isSeoOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {isSeoOpen && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                  <div className="flex flex-col gap-xs">
                    <label className="text-label-md font-bold text-on-surface">SEO Title</label>
                    <input
                      type="text"
                      maxLength={60}
                      value={metaTitle}
                      onChange={(e) => {
                        setMetaTitle(e.target.value);
                        updateIsDirty(true);
                      }}
                      className="bg-surface border border-outline-variant rounded-lg px-sm py-2 text-body-md focus:border-primary outline-none"
                      placeholder="e.g. Home | CMS Site"
                    />
                    <span className="text-[11px] text-on-surface-variant">{metaTitle.length}/60</span>
                  </div>

                  <div className="flex flex-col gap-xs">
                    <label className="text-label-md font-bold text-on-surface">SEO Description</label>
                    <textarea
                      rows={2}
                      maxLength={160}
                      value={metaDescription}
                      onChange={(e) => {
                        setMetaDescription(e.target.value);
                        updateIsDirty(true);
                      }}
                      className="bg-surface border border-outline-variant rounded-lg px-sm py-2 text-body-md focus:border-primary outline-none resize-none"
                      placeholder="e.g. Welcome to our site"
                    />
                    <span className="text-[11px] text-on-surface-variant">{metaDescription.length}/160</span>
                  </div>
                </div>

                {isDraftStatus === false && (
                  <p className="text-[11px] text-on-surface-variant">
                    Editing this while viewing PUBLISHED will create/update a DRAFT — publish it when ready.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Section 3 (Template only): Template Layout Sections */}
          {pageTemplate && pageTemplate.placeholders && (
            <div className="bg-surface rounded-xl border border-outline-variant shadow-sm p-lg flex flex-col gap-md">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setIsTemplateOpen((v) => !v)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsTemplateOpen((v) => !v); } }}
                aria-expanded={isTemplateOpen}
                className="flex items-center justify-between w-full cursor-pointer select-none"
              >
                <div className="flex items-center gap-sm">
                  <span className="material-symbols-outlined text-secondary text-[20px]">view_carousel</span>
                  <h3 className="text-h4 font-semibold text-on-surface">Template: {pageTemplate.name}</h3>
                  <span className="px-sm py-0.5 rounded-full text-[10px] font-bold bg-secondary/10 text-secondary uppercase">{pageTemplate.slugPrefix}</span>
                </div>
                <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
                  {isTemplateOpen ? 'expand_less' : 'expand_more'}
                </span>
              </div>

              {isTemplateOpen && (
                <div className="flex flex-col gap-md">
                  <p className="text-body-sm text-on-surface-variant">
                    This page uses a template layout. Edit each placeholder block below. Free-form content goes in the <strong>Content Outlet</strong> section.
                  </p>

                  {pageTemplate.placeholders
                    .filter((p) => p.type !== 'content-outlet')
                    .map((placeholder) => {
                      const block = placeholderBlocks.get(placeholder.type);
                      return (
                        <div key={placeholder.id}>
                          {block ? (
                            <BlockSectionCard
                              block={block}
                              index={0}
                              totalBlocks={1}
                              customLabel={`${placeholder.type.replace(/-/g, ' ')} (Template Placeholder)`}
                              disableDelete={true}
                              disableDrag={true}
                              onUpdateData={(newData) => updateBlockData(block.id, newData)}
                            />
                          ) : (
                            <div className="border-2 border-dashed border-outline-variant rounded-xl p-lg flex items-center gap-md text-on-surface-variant">
                              <span className="material-symbols-outlined text-[28px] text-outline-variant">add_circle</span>
                              <div className="flex-1">
                                <p className="text-label-md font-bold capitalize">{placeholder.type.replace(/-/g, ' ')} Placeholder</p>
                                <p className="text-body-sm">No block assigned yet. Add a <strong>{placeholder.type}</strong> block from the Page Sections below to fill this placeholder.</p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* Section 4 (was 3): Page Sections (blocks) — header collapsible, Add Block ở cuối header,
              nội dung tự scroll bên trong thay vì kéo dài toàn trang khi mở rộng */}
          <div className="bg-surface rounded-xl border border-outline-variant shadow-sm p-lg flex flex-col gap-md">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setIsBlocksOpen((v) => !v)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsBlocksOpen((v) => !v);
                }
              }}
              aria-expanded={isBlocksOpen}
              className="flex items-center justify-between w-full gap-md cursor-pointer select-none"
            >
              <div className="flex items-center gap-sm min-w-0">
                <h3 className="text-h4 font-semibold text-on-surface">
                  {pageTemplate ? 'Content Outlet' : 'Page Sections'}
                </h3>
                <span className="px-sm py-0.5 rounded-full text-label-sm font-bold bg-outline-variant/30 text-on-surface-variant flex-shrink-0">
                  {pageTemplate ? outletBlocks.length : blocks.length}
                </span>
              </div>

              <div className="flex items-center gap-sm flex-shrink-0">
                <Can permission="page:update">
                  <Button
                    variant="primary"
                    icon="add_box"
                    size="md"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPicker(true);
                    }}
                  >
                    Add Block
                  </Button>
                </Can>
                <span className="material-symbols-outlined text-[20px] text-on-surface-variant flex-shrink-0">
                  {isBlocksOpen ? 'expand_less' : 'expand_more'}
                </span>
              </div>
            </div>

            {isBlocksOpen && (
              <div className="max-h-[65vh] overflow-y-auto pr-xs -mr-xs">
                {/* When template is active, render only outlet blocks */}
                {(pageTemplate ? outletBlocks : blocks).length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-xl text-center border-2 border-dashed border-outline-variant rounded-xl bg-surface">
                    <span className="material-symbols-outlined text-[48px] text-outline-variant mb-md">
                      {pageTemplate ? 'view_agenda' : 'view_stream'}
                    </span>
                    <h4 className="text-h4 text-on-surface">
                      {pageTemplate ? 'No content blocks yet' : 'No blocks in this page version'}
                    </h4>
                    <p className="text-body-md text-on-surface-variant max-w-sm mb-lg mt-sm">
                      {pageTemplate
                        ? 'Add free-form blocks here. They will appear inside the Content Outlet slot in your template.'
                        : 'Add blocks using the button below to start building the page layout.'}
                    </p>
                    <Button variant="secondary" icon="add" onClick={() => setShowPicker(true)}>
                      Add First Block
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-lg">
                    {(pageTemplate ? outletBlocks : blocks).map((block, idx) => (
                      <BlockSectionCard
                        key={block.id}
                        block={block}
                        index={idx}
                        totalBlocks={(pageTemplate ? outletBlocks : blocks).length}
                        isDragging={draggedBlockIndex === idx}
                        isDragOver={dragOverBlockIndex === idx && draggedBlockIndex !== null && draggedBlockIndex !== idx}
                        onDragStart={() => setDraggedBlockIndex(idx)}
                        onDragEnter={() => {
                          if (draggedBlockIndex !== null && draggedBlockIndex !== idx) {
                            setDragOverBlockIndex(idx);
                          }
                        }}
                        onDragEnd={() => {
                          if (draggedBlockIndex !== null && dragOverBlockIndex !== null) {
                            reorderBlocks(draggedBlockIndex, dragOverBlockIndex);
                          }
                          setDraggedBlockIndex(null);
                          setDragOverBlockIndex(null);
                        }}
                        onDelete={() => handleDeleteBlock(block.id)}
                        onUpdateData={(newData) => updateBlockData(block.id, newData)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
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
            {historyVersions.length === 0 && (
              <p className="text-body-sm text-on-surface-variant px-xs">
                No version has been published yet.
              </p>
            )}
            {historyVersions.map((v) => {
              const isCurrent = currentVersion?.id === v.id;
              const canSetAsDraft = v.status === 'ARCHIVED';
              const canDelete = v.status === 'DRAFT' || v.status === 'ARCHIVED';
              return (
                <div
                  key={v.id}
                  className={`flex items-center justify-between rounded-lg border px-md py-sm ${
                    isCurrent
                      ? 'border-primary bg-primary/5'
                      : 'border-outline-variant bg-surface-container'
                  }`}
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-body-sm font-medium text-on-surface truncate">
                      {new Date(v.createdAt).toLocaleString('vi-VN')}
                    </span>
                    <span
                      className={`text-label-sm font-semibold ${
                        v.status === 'DRAFT'
                          ? 'text-on-surface-variant'
                          : v.status === 'PUBLISHED'
                            ? 'text-primary'
                            : 'text-secondary'
                      }`}
                    >
                      {v.status}
                      {isCurrent && ' · You are here'}
                    </span>
                  </div>
                  <div className="flex items-center gap-xs flex-shrink-0">
                    {canSetAsDraft && (
                      <Can permission="page:update">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRevertClick(v)}
                          disabled={isReverting || isDeletingVersion}
                        >
                          Set as Draft
                        </Button>
                      </Can>
                    )}
                    {canDelete && (
                      <Can permission="page:delete">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon="delete"
                          onClick={() => handleDeleteVersionClick(v)}
                          disabled={isReverting || isDeletingVersion}
                          aria-label="Delete version"
                        />
                      </Can>
                    )}
                  </div>
                </div>
              );
            })}
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
            <h3 className="text-h4 font-semibold text-on-surface">Set this version as Draft?</h3>
            <p className="mt-xs text-body-sm text-on-surface-variant">
              Version:{' '}
              <span className="font-medium text-on-surface">
                {new Date(pendingRevertVersion.createdAt).toLocaleString('vi-VN')}
              </span>
            </p>

            {/* Warning message tùy trạng thái draft */}
            <div className="mt-md rounded-lg border border-warning/40 bg-warning/10 px-md py-sm text-body-sm text-on-surface">
              {isDirty
                ? '⚠️ You have unsaved changes. Setting this as Draft will erase all of those changes.'
                : isDraftStatus
                  ? '⚠️ The current DRAFT will be overwritten with a copy of this version.'
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
                {isReverting ? 'Processing...' : 'Set as Draft'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Version Confirm Dialog */}
      {pendingDeleteVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-surface p-xl shadow-xl">
            <h3 className="text-h4 font-semibold text-on-surface">Delete this version?</h3>
            <p className="mt-xs text-body-sm text-on-surface-variant">
              Version:{' '}
              <span className="font-medium text-on-surface">
                {new Date(pendingDeleteVersion.createdAt).toLocaleString('vi-VN')}
              </span>{' '}
              <span className="font-medium text-on-surface">({pendingDeleteVersion.status})</span>
            </p>

            <div className="mt-md rounded-lg border border-error/40 bg-error/10 px-md py-sm text-body-sm text-on-surface">
              ⚠️ This action is permanent and cannot be undone.
              {pendingDeleteVersion.id === currentVersion?.id &&
                ' You are currently editing this version — deleting it will reload the editor.'}
            </div>

            <div className="mt-lg flex justify-end gap-sm">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPendingDeleteVersion(null)}
                disabled={isDeletingVersion}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmDeleteVersion}
                loading={isDeletingVersion}
                disabled={isDeletingVersion}
              >
                {isDeletingVersion ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}