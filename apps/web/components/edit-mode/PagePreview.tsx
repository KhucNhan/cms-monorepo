'use client';

import { useEffect, useRef } from 'react';
import { BlockRenderer } from '@/components/blocks';
import type { Block } from '@/types';
import { useViewport } from './ViewportContext';

interface PagePreviewProps {
  blocks: Block[];
  selectedBlockId?: string | null;
  onSelectBlock?: (id: string) => void;
}

export function PagePreview({ blocks, selectedBlockId, onSelectBlock }: PagePreviewProps) {
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const resizingRef = useRef(false);

  // Viewport (mobile/tablet/desktop/custom) không còn toolbar riêng ở đây — điều khiển
  // từ AdminNavbar, chia sẻ qua ViewportContext (bọc ở layout.tsx) vì AdminNavbar và
  // PagePreview là 2 nhánh anh em, không có quan hệ cha-con để truyền props trực tiếp.
  const { activeWidth, customWidth, setCustomWidth, setPreset } = useViewport();

  useEffect(() => {
    if (!selectedBlockId) return;
    blockRefs.current[selectedBlockId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [selectedBlockId]);

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
    // pt-14 giữ nguyên để chừa chỗ cho AdminNavbar nổi phía trên (nay gánh thêm viewport
    // switcher, nhưng vẫn cùng 1 thanh cố định nên không cần đổi offset).
    <div className="flex h-full min-h-0 flex-col bg-gray-100 pt-14">
      {/* Đây là scroll container DUY NHẤT của preview — min-h-0 để nhận chiều cao
          còn lại từ flex-col cha, overflow-y-auto để tự cuộn khi nội dung dài hơn
          khung nhìn. Toolbar chọn viewport trước đây nằm ở đây đã chuyển lên
          AdminNavbar (xem components/AdminNavbar.tsx + edit-mode/ViewportContext.tsx). */}
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