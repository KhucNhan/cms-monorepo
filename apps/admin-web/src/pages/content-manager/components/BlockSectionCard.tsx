import { useState } from 'react';
import type { Block } from '@/types';
import { BlockDataForm } from './BlockDataForm';

interface BlockSectionCardProps {
  block: Block;
  index: number;
  totalBlocks: number;
  onMove: (direction: 'up' | 'down') => void;
  onDelete: () => void;
  onUpdateData: (newData: any) => void;
}

const ICON_MAP: Record<string, string> = {
  hero: 'view_day',
  'rich-text': 'notes',
  faq: 'help',
};

export function BlockSectionCard({
  block,
  index,
  totalBlocks,
  onMove,
  onDelete,
  onUpdateData,
}: BlockSectionCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const icon = ICON_MAP[block.type] ?? 'widgets';
  const bodyId = `block-section-${block.id}`;

  return (
    <div className="bg-surface rounded-xl border border-outline-variant shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-lg py-md bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
        <div className="flex items-center gap-md min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-primary text-[18px]">{icon}</span>
          </div>
          <div className="min-w-0">
            <span className="text-label-md font-bold text-on-surface capitalize">
              {block.type.replace('-', ' ')} Block
            </span>
            {/* <span className="ml-md text-[11px] text-on-surface-variant font-mono bg-surface-container px-xs rounded py-0.5">
              ID: {block.id.slice(0, 8)}
            </span> */}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-xs">
          <button
            type="button"
            onClick={() => setIsCollapsed((current) => !current)}
            className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-all cursor-pointer"
            title={isCollapsed ? 'Expand Block' : 'Collapse Block'}
            aria-expanded={!isCollapsed}
            aria-controls={bodyId}
          >
            <span className="material-symbols-outlined text-[18px]">
              {isCollapsed ? 'expand_more' : 'expand_less'}
            </span>
          </button>

          <div className="w-px h-5 bg-outline-variant mx-1" />

          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMove('up')}
            className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-all disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
            title="Move Up"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
          </button>
          
          <button
            type="button"
            disabled={index === totalBlocks - 1}
            onClick={() => onMove('down')}
            className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-all disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
            title="Move Down"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
          </button>

          <div className="w-px h-5 bg-outline-variant mx-1" />

          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-all cursor-pointer"
            title="Delete Block"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
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
