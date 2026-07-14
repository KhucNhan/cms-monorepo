'use client';

import { useEffect, useRef, useState } from 'react';
import { BlockRenderer } from '@/components/blocks';
import type { Block } from '@/types';

interface PagePreviewProps {
  blocks: Block[];
  selectedBlockId?: string | null;
  onSelectBlock?: (id: string) => void;
}

type ViewportPreset = 'mobile' | 'tablet' | 'desktop' | 'custom';

const PRESETS: { key: ViewportPreset; label: string; width: number | null }[] = [
  { key: 'mobile', label: 'Mobile', width: 375 },
  { key: 'tablet', label: 'Tablet', width: 768 },
  { key: 'desktop', label: 'Desktop', width: null },
];

function DeviceIcon({ preset }: { preset: ViewportPreset }) {
  if (preset === 'mobile') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M11 18h2" strokeLinecap="round" />
      </svg>
    );
  }
  if (preset === 'tablet') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <path d="M11 18h2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="13" rx="1" />
      <path d="M8 20h8M12 17v3" strokeLinecap="round" />
    </svg>
  );
}

export function PagePreview({ blocks, selectedBlockId, onSelectBlock }: PagePreviewProps) {
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [preset, setPreset] = useState<ViewportPreset>('desktop');
  const [customWidth, setCustomWidth] = useState(1024);
  const resizingRef = useRef(false);

  useEffect(() => {
    if (!selectedBlockId) return;
    blockRefs.current[selectedBlockId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [selectedBlockId]);

  const activeWidth =
    preset === 'custom' ? customWidth : PRESETS.find((p) => p.key === preset)?.width ?? null;

  function startResize(e: React.PointerEvent, direction: 1 | -1) {
    e.preventDefault();
    resizingRef.current = true;
    const startX = e.clientX;
    const startWidth = activeWidth ?? customWidth;
    setPreset('custom');

    function onMove(ev: PointerEvent) {
      if (!resizingRef.current) return;
      const delta = (ev.clientX - startX) * direction * 2;
      setCustomWidth(Math.max(320, Math.min(1920, startWidth + delta)));
    }
    function onUp() {
      resizingRef.current = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  return (
    // h-full + min-h-0: nhận chiều cao từ grid cha (EditModeLayout), không tự ý
    // co giãn theo nội dung — đây là điều kiện tiên quyết để overflow bên dưới hoạt động.
    <div className="flex h-full min-h-0 flex-col bg-gray-100 pt-14">
      {/* Toolbar chọn viewport — chiều cao cố định, không tham gia scroll */}
      <div className="flex shrink-0 items-center justify-center gap-1 border-b bg-white px-3 py-2">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => {
              setPreset(p.key);
              if (p.width) setCustomWidth(p.width);
            }}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              preset === p.key ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
            }`}
            title={p.label}
          >
            <DeviceIcon preset={p.key} />
            {p.label}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-gray-200" aria-hidden />
        <span className="text-xs tabular-nums text-gray-400">
          {activeWidth ? `${Math.round(activeWidth)}px` : 'Full width'}
        </span>
      </div>

      {/* Đây là scroll container DUY NHẤT của preview — min-h-0 để nhận
          chiều cao còn lại từ flex-col cha (sau khi trừ toolbar cố định phía trên),
          overflow-y-auto để tự cuộn khi nội dung dài hơn khung nhìn. */}
      <div className="relative min-h-0 flex-1 overflow-y-auto p-6">
        <div className="flex justify-center">
          <div
            className="relative w-full rounded-md bg-white shadow-sm ring-1 ring-gray-200 transition-[width] duration-150"
            style={{ width: activeWidth ? `${activeWidth}px` : '100%' }}
            // Không đặt overflow/height ở đây — đây chỉ là khung hiển thị (giả lập
            // viewport thiết bị), để nội dung tự nhiên tràn dài ra, scroll thật sự
            // do div cha (.overflow-y-auto ở trên) đảm nhiệm.
          >
            {activeWidth && (
              <>
                <div
                  onPointerDown={(e) => startResize(e, -1)}
                  className="absolute -left-1.5 top-1/2 z-10 h-10 w-3 -translate-y-1/2 cursor-ew-resize rounded-full bg-gray-300 hover:bg-indigo-400"
                  title="Kéo để đổi chiều rộng"
                />
                <div
                  onPointerDown={(e) => startResize(e, 1)}
                  className="absolute -right-1.5 top-1/2 z-10 h-10 w-3 -translate-y-1/2 cursor-ew-resize rounded-full bg-gray-300 hover:bg-indigo-400"
                  title="Kéo để đổi chiều rộng"
                />
              </>
            )}

            {blocks.map((block) => (
              <div
                key={block.id}
                ref={(el) => {
                  blockRefs.current[block.id] = el;
                }}
                role={onSelectBlock ? 'button' : undefined}
                tabIndex={onSelectBlock ? 0 : undefined}
                onClick={() => onSelectBlock?.(block.id)}
                className={`relative outline-offset-[-2px] transition-[outline] ${
                  selectedBlockId === block.id
                    ? 'outline outline-2 outline-indigo-500'
                    : 'outline outline-2 outline-transparent hover:outline-indigo-300'
                }`}
              >
                {BlockRenderer({ block })}
              </div>
            ))}
            {blocks.length === 0 && (
              <p className="p-8 text-center text-sm text-gray-400">
                Chưa có block nào — dùng panel bên trái để thêm block mới.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}