import { useState } from 'react';
import type { Block } from '@/types';
import { BlockDataForm } from './block-editors/BlockDataForm';
import { Can } from '@/components/Can';

interface BlockSectionCardProps {
  block: Block;
  index: number;
  totalBlocks: number;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: () => void;
  onDragEnter?: () => void;
  onDragEnd?: () => void;
  onDelete?: () => void;
  onUpdateData: (newData: any) => void;
  disableDelete?: boolean;
  disableDrag?: boolean;
  customLabel?: string;
}

const ICON_MAP: Record<string, string> = {
  hero: 'view_day',
  'rich-text': 'notes',
  faq: 'help',
};

export function BlockSectionCard({
  block,
  index: _index,
  totalBlocks: _totalBlocks,
  isDragging = false,
  isDragOver = false,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDelete,
  onUpdateData,
  disableDelete = false,
  disableDrag = false,
  customLabel,
}: BlockSectionCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const icon = ICON_MAP[block.type] ?? 'widgets';
  const bodyId = `block-section-${block.id}`;

  const toggleCollapsed = () => setIsCollapsed((current) => !current);

  return (
    <div
      className={`bg-surface rounded-xl border shadow-sm overflow-hidden transition-all ${
        isDragging
          ? 'opacity-40 border-primary'
          : isDragOver
            ? 'border-primary border-2 border-dashed'
            : 'border-outline-variant'
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        if (onDragEnter) onDragEnter();
      }}
      onDrop={(e) => e.preventDefault()}
    >
      {/* Header — click to collapse/expand */}
      <div
        role="button"
        tabIndex={0}
        onClick={toggleCollapsed}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleCollapsed();
          }
        }}
        aria-expanded={!isCollapsed}
        aria-controls={bodyId}
        className="px-lg py-md bg-surface-container-low border-b border-outline-variant flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-md min-w-0">
          {/* Drag handle */}
          {!disableDrag && (
            <span
              draggable
              role="button"
              aria-label="Drag to reorder"
              title="Drag to reorder"
              onClick={(e) => e.stopPropagation()}
              onDragStart={(e) => {
                e.stopPropagation();
                e.dataTransfer.effectAllowed = 'move';
                if (onDragStart) onDragStart();
              }}
              onDragEnd={(e) => {
                e.stopPropagation();
                if (onDragEnd) onDragEnd();
              }}
              className="material-symbols-outlined text-[20px] text-on-surface-variant cursor-grab active:cursor-grabbing hover:text-primary flex-shrink-0"
            >
              drag_indicator
            </span>
          )}

          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-primary text-[18px]">{icon}</span>
          </div>
          <div className="min-w-0">
            <span className="text-label-md font-bold text-on-surface capitalize">
              {customLabel || `${block.type.replace('-', ' ')} Block`}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-xs">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapsed();
            }}
            className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-all cursor-pointer"
            title={isCollapsed ? 'Expand Block' : 'Collapse Block'}
          >
            <span className="material-symbols-outlined text-[18px]">
              {isCollapsed ? 'expand_more' : 'expand_less'}
            </span>
          </button>

          {!disableDelete && (
            <>
              <div className="w-px h-5 bg-outline-variant mx-1" />

              <Can permission="page:update">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onDelete) onDelete();
                  }}
                  className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-all cursor-pointer"
                  title="Delete Block"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </Can>
            </>
          )}
        </div>
      </div>

      {/* Body / Data Editors */}
      {!isCollapsed && (
        <div id={bodyId} className="p-lg bg-surface">
          <BlockDataForm
            type={block.type}
            data={block.data}
            onChange={onUpdateData}
          />
        </div>
      )}
    </div>
  );
}