'use client';

import { useState, useRef } from 'react';
import { MediaPicker } from './MediaPicker';
import { BlockPickerModal } from './BlockPickerModal';
import { ConfirmDialog } from './ConfirmDialog';
import { BlockDataForm } from './block-editors/BlockDataForm';
import type { Block } from '@/types';

interface EditPanelProps {
  blocks: Block[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  onChangeBlockData: (id: string, data: Record<string, unknown>) => void;
  onAddBlock: (type: string) => void;
  onDeleteBlock: (id: string) => void;
  onReorderBlocks: (orderedIds: string[]) => void;
  slug: string;
  dirty: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
}

const BLOCK_TYPE_LABELS: Record<string, string> = {
  hero: 'Hero Section',
  'rich-text': 'Rich Text',
  faq: 'FAQ',
};

// Thống nhất icon dùng Material Symbols Outlined — cùng bộ icon với các block Editor
// dùng chung trong packages/block-registry (FaqEditor/HeroEditor dùng
// <span className="material-symbols-outlined">...</span>), thay vì SVG riêng như trước.
function TrashIcon({ className }: { className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className ?? ''}`}>delete</span>
  );
}

function ChevronIcon({ open, className }: { open: boolean; className?: string }) {
  return (
    <span
      className={`material-symbols-outlined transition-transform ${open ? 'rotate-90' : ''} ${className ?? ''}`}
    >
      chevron_right
    </span>
  );
}

function DragHandleIcon({ className }: { className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className ?? ''}`}>drag_indicator</span>
  );
}

export function EditPanel({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onChangeBlockData,
  onAddBlock,
  onDeleteBlock,
  onReorderBlocks,
  slug,
  dirty,
  saving,
  error,
  onClose,
  onSaveDraft,
  onPublish,
}: EditPanelProps) {
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [showBlockPicker, setShowBlockPicker] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const dragIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  function handleDrop(targetIndex: number) {
    const from = dragIndex.current;
    if (from === null || from === targetIndex) {
      dragIndex.current = null;
      setDragOverIndex(null);
      return;
    }
    const next = [...blocks];
    const [moved] = next.splice(from, 1);
    next.splice(targetIndex, 0, moved);
    onReorderBlocks(next.map((b) => b.id));
    dragIndex.current = null;
    setDragOverIndex(null);
  }

  return (
    <div className="flex h-full min-h-0 flex-col border-r bg-gray-50">
      <div className="shrink-0 border-b p-3">
        <button
          onClick={() => setShowBlockPicker(true)}
          className="flex w-full items-center justify-center gap-1 rounded bg-indigo-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
        >
          + Add block
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {blocks.length === 0 && <p className="p-3 text-xs text-gray-400">No blocks yet.</p>}

        {blocks.map((block, index) => {
          const isExpanded = selectedBlockId === block.id;
          return (
            <div
              key={block.id}
              draggable
              onDragStart={() => {
                dragIndex.current = index;
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverIndex(index);
              }}
              onDragLeave={() => setDragOverIndex((cur) => (cur === index ? null : cur))}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(index);
              }}
              className={`border-b ${dragOverIndex === index ? 'border-t-2 border-t-indigo-500' : ''}`}
            >
              <div
                onClick={() => onSelectBlock(isExpanded ? null : block.id)}
                className={`flex cursor-pointer items-center justify-between px-3 py-2 text-sm ${
                  isExpanded ? 'bg-indigo-50' : 'hover:bg-gray-100'
                }`}
              >
                <span className="flex items-center gap-1 font-medium">
                  <DragHandleIcon className="text-[18px] cursor-grab text-gray-300 hover:text-gray-500" />
                  <ChevronIcon open={isExpanded} className="text-[16px] text-gray-400" />
                  {BLOCK_TYPE_LABELS[block.type] ?? block.type}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteId(block.id);
                  }}
                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Delete block"
                >
                  <TrashIcon className="text-[18px]" />
                </button>
              </div>

              {isExpanded && (
                <div className="border-t bg-white p-3">
                  <BlockDataForm
                    type={block.type}
                    data={block.data ?? {}}
                    onChange={(data) => onChangeBlockData(block.id, data)}
                    onOpenMediaPicker={() => setPickerFor(block.id)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {pickerFor && (
        <MediaPicker
          onClose={() => setPickerFor(null)}
          onSelect={(media) => {
            const target = blocks.find((b) => b.id === pickerFor);
            const data = (target?.data ?? {}) as Record<string, unknown>;
            const currentImage = (data.image as Record<string, unknown>) ?? {};
            onChangeBlockData(pickerFor, {
              ...data,
              image: { ...currentImage, mediaId: media.id, url: media.url },
            });
            setPickerFor(null);
          }}
        />
      )}

      {showBlockPicker && (
        <BlockPickerModal
          onClose={() => setShowBlockPicker(false)}
          onSelect={(type) => {
            onAddBlock(type);
            setShowBlockPicker(false);
          }}
        />
      )}

      {confirmDeleteId && (
        <ConfirmDialog
          title="Delete block"
          message="Are you sure you want to delete this block? This action cannot be undone."
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={() => {
            onDeleteBlock(confirmDeleteId);
            setConfirmDeleteId(null);
          }}
        />
      )}

      <div className="min-h-0 border-t bg-gray-50 p-3">
        <div className="mb-2 text-xs text-gray-500">
          /{slug} {dirty && <span className="text-amber-600">• unsaved changes</span>}
        </div>
        {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="rounded px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100">
            Close
          </button>
          <button
            onClick={onSaveDraft}
            disabled={saving || !dirty}
            className="flex-1 rounded bg-gray-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button
            onClick={onPublish}
            disabled={saving}
            className="flex-1 rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  );
}