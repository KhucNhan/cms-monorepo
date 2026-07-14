'use client';

import { useState, useRef } from 'react';
import { MediaPicker } from './MediaPicker';
import { BlockPickerModal } from './BlockPickerModal';
import { ConfirmDialog } from './ConfirmDialog';
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

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z"
      />
    </svg>
  );
}

function ChevronIcon({ open, className }: { open: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`transition-transform ${open ? 'rotate-90' : ''} ${className ?? ''}`}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
    </svg>
  );
}

function DragHandleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="8" cy="6" r="1.5" />
      <circle cx="8" cy="12" r="1.5" />
      <circle cx="8" cy="18" r="1.5" />
      <circle cx="16" cy="6" r="1.5" />
      <circle cx="16" cy="12" r="1.5" />
      <circle cx="16" cy="18" r="1.5" />
    </svg>
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function extractPlainText(content: Record<string, any> | undefined): string {
  const paragraphs = content?.content ?? [];
  return paragraphs
    .map((p: any) =>
      (p.content ?? []).map((t: any) => t.text ?? '').join(''),
    )
    .join('\n');
}

function buildRichTextFromPlainText(text: string) {
  const lines = text.split('\n');
  return {
    content: {
      type: 'doc',
      content: lines.map((line) => ({
        type: 'paragraph',
        content: line ? [{ type: 'text', text: line }] : [],
      })),
    },
    htmlFallback: lines.map((line) => `<p>${escapeHtml(line)}</p>`).join(''),
  };
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
                  <DragHandleIcon className="h-4 w-4 cursor-grab text-gray-300 hover:text-gray-500" />
                  <ChevronIcon open={isExpanded} className="h-3.5 w-3.5 text-gray-400" />
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
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>

              {isExpanded && (
                <div className="border-t bg-white p-3">
                  <BlockForm
                    block={block}
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

function BlockForm({
  block,
  onChange,
  onOpenMediaPicker,
}: {
  block: Block;
  onChange: (data: Record<string, unknown>) => void;
  onOpenMediaPicker: () => void;
}) {
  const data = (block.data ?? {}) as Record<string, any>;

  // ── Hero — matches packages/block-registry/src/blocks/hero/schema.ts ──
  if (block.type === 'hero') {
    const image = data.image ?? { mediaId: '', alt: '', url: '' };
    return (
      <div className="space-y-3 text-sm">
        <Field label="Title">
          <input
            className="w-full rounded border px-2 py-1"
            value={data.title ?? ''}
            onChange={(e) => onChange({ ...data, title: e.target.value })}
          />
        </Field>
        <Field label="Subtitle">
          <textarea
            className="w-full rounded border px-2 py-1"
            rows={2}
            value={data.subtitle ?? ''}
            onChange={(e) => onChange({ ...data, subtitle: e.target.value })}
          />
        </Field>
        <Field label="Image">
          <div className="flex items-center gap-2">
            {image.url && <img src={image.url} alt={image.alt ?? ''} className="h-12 w-12 rounded object-cover" />}
            <button
              onClick={onOpenMediaPicker}
              className="rounded bg-gray-100 px-2 py-1 text-xs font-medium hover:bg-gray-200"
            >
              Choose image
            </button>
          </div>
        </Field>
        <Field label="Image alt text">
          <input
            className="w-full rounded border px-2 py-1"
            value={image.alt ?? ''}
            onChange={(e) => onChange({ ...data, image: { ...image, alt: e.target.value } })}
          />
        </Field>
        <Field label="Button text">
          <input
            className="w-full rounded border px-2 py-1"
            value={data.buttonText ?? ''}
            onChange={(e) => onChange({ ...data, buttonText: e.target.value })}
          />
        </Field>
        <Field label="Button link">
          <input
            className="w-full rounded border px-2 py-1"
            value={data.buttonHref ?? ''}
            onChange={(e) => onChange({ ...data, buttonHref: e.target.value })}
          />
        </Field>
        <Field label="Text alignment">
          <select
            className="w-full rounded border px-2 py-1"
            value={data.alignment ?? 'center'}
            onChange={(e) => onChange({ ...data, alignment: e.target.value })}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </Field>
        <Field label={`Overlay opacity (${data.overlayOpacity ?? 40}%)`}>
          <input
            type="range"
            min={0}
            max={100}
            className="w-full"
            value={data.overlayOpacity ?? 40}
            onChange={(e) => onChange({ ...data, overlayOpacity: Number(e.target.value) })}
          />
        </Field>
      </div>
    );
  }

  // ── Rich Text — matches schema.ts: `content` is ProseMirror JSON, `htmlFallback` is
  // the sanitized HTML actually rendered by apps/web. There is no TipTap editor in
  // apps/web (deliberately not bundled — see plan), so this is a simplified raw-HTML
  // editor: it edits `htmlFallback` directly and wraps it in a minimal single-node
  // `content` doc so the block stays schema-valid. This does NOT round-trip through
  // a real rich-text editor; if full WYSIWYG editing is needed later, that requires
  // bundling TipTap here too — flag as a known limitation, not a bug.
  // EditPanel.tsx — trong BlockForm, case 'rich-text'
  if (block.type === 'rich-text') {
    const plainText = extractPlainText(data.content);
    return (
        <Field label="Text content">
        <textarea
            className="w-full rounded border px-2 py-1 text-xs"
            rows={10}
            value={plainText}
            onChange={(e) => {
            const { content, htmlFallback } = buildRichTextFromPlainText(e.target.value);
            onChange({ ...data, content, htmlFallback });
            }}
        />
        </Field>
    );
    }

  // ── FAQ — matches schema.ts ──
  if (block.type === 'faq') {
    const items: Array<{ question: string; answer: string }> = data.items ?? [];
    return (
      <div className="space-y-3 text-sm">
        <Field label="Heading">
          <input
            className="w-full rounded border px-2 py-1"
            value={data.heading ?? ''}
            onChange={(e) => onChange({ ...data, heading: e.target.value })}
          />
        </Field>
        {items.map((item, i) => (
          <div key={i} className="rounded border p-2">
            <input
              className="mb-1 w-full rounded border px-2 py-1"
              placeholder="Question"
              value={item.question}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...next[i], question: e.target.value };
                onChange({ ...data, items: next });
              }}
            />
            <textarea
              className="w-full rounded border px-2 py-1"
              placeholder="Answer"
              rows={2}
              value={item.answer}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...next[i], answer: e.target.value };
                onChange({ ...data, items: next });
              }}
            />
          </div>
        ))}
        <button
          onClick={() => onChange({ ...data, items: [...items, { question: '', answer: '' }] })}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          + Add question
        </button>
      </div>
    );
  }

  return <p className="text-xs text-gray-400">Block type "{block.type}" has no dedicated editor in apps/web.</p>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-500">{label}</span>
      {children}
    </label>
  );
}