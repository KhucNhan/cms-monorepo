'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { EditPanel } from './EditPanel';
import { PagePreview } from './PagePreview';
import type { Block } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface EditModeLayoutProps {
  pageId: string;
  slug: string;
  initialBlocks: Block[];
  onClose: () => void;
}

export function EditModeLayout({ pageId, slug, initialBlocks, onClose }: EditModeLayoutProps) {
  const [versionId, setVersionId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // Khóa scroll của <body> khi overlay Edit Mode đang mở, nếu không con lăn chuột
  // sẽ cuộn body (nằm dưới overlay `fixed inset-0`) thay vì cuộn bên trong overlay.
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  const didFetchRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (didFetchRef.current) return;
    didFetchRef.current = true;

    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/pages/${pageId}/draft`, {
          method: 'POST',
          credentials: 'include',
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Failed to load draft');
        if (mountedRef.current) {
          setVersionId(json.data.id);
          setBlocks(json.data.blocks ?? []);
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to load draft');
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  const handleChangeBlockData = useCallback((id: string, data: Record<string, unknown>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, data } : b)));
    setDirty(true);
  }, []);

  const handleAddBlock = useCallback(
    async (type: string) => {
      if (!versionId) return;
      setError(null);
      try {
        const res = await fetch(`${API_URL}/api/v1/blocks`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pageVersionId: versionId, type, orderIndex: blocks.length }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Failed to add block');
        setBlocks((prev) => [...prev, json.data]);
        setSelectedBlockId(json.data.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add block');
      }
    },
    [versionId, blocks.length],
  );

  const handleDeleteBlock = useCallback(async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/blocks/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Failed to delete block');
      setBlocks((prev) => prev.filter((b) => b.id !== id));
      setSelectedBlockId((cur) => (cur === id ? null : cur));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete block');
    }
  }, []);

  const handleSaveDraft = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await Promise.all(
        blocks.map((b) =>
          fetch(`${API_URL}/api/v1/blocks/${b.id}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: b.data }),
          }).then(async (res) => {
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json?.error?.message ?? `Failed to save block ${b.id}`);
          }),
        ),
      );
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  }, [blocks]);

  const handlePublish = useCallback(async () => {
    if (!versionId) return;
    setSaving(true);
    setError(null);
    try {
      if (dirty) await handleSaveDraft();
      const res = await fetch(`${API_URL}/api/v1/pages/${pageId}/versions/${versionId}/publish`, {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Failed to publish');
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setSaving(false);
    }
  }, [pageId, versionId, dirty, handleSaveDraft]);

  const handleReorderBlocks = useCallback(async (orderedIds: string[]) => {
    setBlocks((prev) => {
      const map = new Map(prev.map((b) => [b.id, b]));
      return orderedIds.map((id) => map.get(id)!).filter(Boolean);
    });
    setDirty(true);
    try {
      await Promise.all(
        orderedIds.map((id, index) =>
          fetch(`${API_URL}/api/v1/blocks/${id}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderIndex: index }),
          }),
        ),
      );
    } catch {
      setError('Failed to save new block order');
    }
  }, []);

  return (
    // h-screen (thay vì inset-0 phụ thuộc body) + overflow-hidden ở gốc overlay:
    // đây là nơi DUY NHẤT chặn scroll tràn ra ngoài; mọi scroll thật sự phải
    // xảy ra ở các con bên trong (EditPanel / PagePreview), không phải ở đây.
    <div className="fixed inset-0 z-[9998] flex h-screen flex-col overflow-hidden bg-white">
      {/* min-h-0 bắt buộc: flex item mặc định min-height:auto sẽ không co lại
          nhỏ hơn nội dung, khiến overflow của con bên trong không bao giờ kích hoạt */}
      <div className="grid min-h-0 flex-1 grid-cols-[320px_1fr] overflow-hidden">
        {loading ? (
          <div className="col-span-2 flex items-center justify-center text-sm text-gray-400">
            Loading draft…
          </div>
        ) : (
          <>
            <EditPanel
              blocks={blocks}
              selectedBlockId={selectedBlockId}
              onReorderBlocks={handleReorderBlocks}
              onSelectBlock={setSelectedBlockId}
              onChangeBlockData={handleChangeBlockData}
              onAddBlock={handleAddBlock}
              onDeleteBlock={handleDeleteBlock}
              slug={slug}
              dirty={dirty}
              saving={saving}
              error={error}
              onClose={onClose}
              onSaveDraft={handleSaveDraft}
              onPublish={handlePublish}
            />
            <PagePreview blocks={blocks} selectedBlockId={selectedBlockId} onSelectBlock={setSelectedBlockId} />
          </>
        )}
      </div>
    </div>
  );
}