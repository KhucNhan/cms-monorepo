'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './edit-mode/AuthProvider';
import { useViewport, type ViewportPreset } from './edit-mode/ViewportContext';

interface AdminNavbarProps {
  /** Current page slug — shown in the admin bar for context */
  slug?: string;
  /** Whether edit mode is currently active */
  editMode: boolean;
  onToggleEdit: () => void;
}

const VIEWPORT_PRESETS: { key: ViewportPreset; label: string; icon: string }[] = [
  { key: 'mobile', label: 'Mobile', icon: 'smartphone' },
  { key: 'tablet', label: 'Tablet', icon: 'tablet_mac' },
  { key: 'desktop', label: 'Desktop', icon: 'desktop_windows' },
];

/** Vị trí đã kéo được nhớ qua reload — top/left tính bằng px, góc trên-trái thanh navbar. */
const POSITION_STORAGE_KEY = 'cms-admin-navbar-position';

/**
 * AdminNavbar — floating admin action bar shown at the top of the public site
 * when the visiting browser session belongs to an authenticated admin.
 *
 * Design: glassmorphism pill anchored at the top-center of the page.
 * Keeps the public site visually untouched below it.
 */
export function AdminNavbar({ slug, editMode, onToggleEdit }: AdminNavbarProps) {
  const { permissions } = useAuth();
  const canEdit = permissions.includes('page:update');

  // Viewport switcher đọc/ghi qua ViewportContext (bọc ở layout.tsx) thay vì props —
  // AdminNavbar và EditModeLayout/PagePreview là 2 nhánh anh em dưới layout.tsx,
  // không có quan hệ cha-con nên không thể truyền props trực tiếp xuống nhau.
  const { preset, activeWidth, setPreset } = useViewport();

  // Chỉ hiện viewport switcher khi đang edit mode — không có ý nghĩa lúc xem site bình thường.
  const showViewportSwitcher = editMode;

  // ── Kéo thả tự do ──────────────────────────────────────────────────────────
  // Mặc định: cố định top-center (giữ nguyên hành vi cũ, dùng Tailwind class).
  // Sau khi người dùng kéo lần đầu: chuyển sang toạ độ px tuyệt đối (top/left),
  // để thanh có thể tránh xa các UI khác (vd. slug/url switcher) đang bị che.
  const barRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const clampToViewport = useCallback((pos: { top: number; left: number }) => {
    const bar = barRef.current;
    const w = bar?.offsetWidth ?? 320;
    const h = bar?.offsetHeight ?? 40;
    const margin = 8;
    const maxLeft = Math.max(margin, window.innerWidth - w - margin);
    const maxTop = Math.max(margin, window.innerHeight - h - margin);
    return {
      left: Math.min(Math.max(margin, pos.left), maxLeft),
      top: Math.min(Math.max(margin, pos.top), maxTop),
    };
  }, []);

  // Đọc vị trí đã lưu lúc mount — chỉ chạy ở client (localStorage không tồn tại
  // lúc SSR), nên bọc trong useEffect + cờ `hydrated` để tránh nhấp nháy vị trí
  // mặc định trước khi khôi phục xong.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(POSITION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { top: number; left: number };
        if (typeof parsed?.top === 'number' && typeof parsed?.left === 'number') {
          setPosition(clampToViewport(parsed));
        }
      }
    } catch {
      // localStorage bị chặn (private mode, v.v.) — bỏ qua, dùng vị trí mặc định.
    } finally {
      setHydrated(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resize cửa sổ → clamp lại để thanh không bị kẹt ngoài màn hình (vd. thu nhỏ
  // trình duyệt sau khi đã kéo navbar ra sát mép phải).
  useEffect(() => {
    function handleResize() {
      setPosition((p) => (p ? clampToViewport(p) : p));
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampToViewport]);

  function startDrag(e: React.PointerEvent) {
    // Chỉ kéo bằng nút chuột chính / chạm chính, tránh xung đột với thao tác khác.
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();

    const bar = barRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    draggingRef.current = true;

    function onMove(ev: PointerEvent) {
      if (!draggingRef.current) return;
      setPosition(clampToViewport({ left: ev.clientX - offsetX, top: ev.clientY - offsetY }));
    }
    function onUp() {
      draggingRef.current = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      // Lưu lại vị trí cuối cùng sau khi thả tay — đọc trực tiếp từ state hiện
      // tại qua callback để tránh stale closure.
      setPosition((p) => {
        if (p) {
          try {
            window.localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(p));
          } catch {
            // bỏ qua nếu localStorage không khả dụng
          }
        }
        return p;
      });
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function resetPosition() {
    setPosition(null);
    try {
      window.localStorage.removeItem(POSITION_STORAGE_KEY);
    } catch {
      // bỏ qua
    }
  }

  // Trước khi hydrate xong, luôn dùng vị trí mặc định (tránh flash sai vị trí).
  const effectivePosition = hydrated ? position : null;

  return (
    <div
      ref={barRef}
      role="banner"
      aria-label="Admin toolbar"
      style={{
        ...(effectivePosition ? { top: effectivePosition.top, left: effectivePosition.left } : {}),
        // Chặn trình duyệt tự tạo "ghost image" (bản clone mờ, thiếu nội dung động
        // như slug) khi rê chuột qua text/span bên trong lúc kéo — đây là hành vi
        // native HTML drag-and-drop của trình duyệt, không liên quan tới pointer
        // events tự viết ở startDrag(). Class `select-none` (Tailwind) chỉ set
        // user-select, KHÔNG đủ để chặn ghost ở mọi engine (Chrome/Safari vẫn tạo
        // ghost khi kéo qua node có text nếu không set thêm các cờ dưới đây).
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitUserDrag: 'none',
      } as React.CSSProperties}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      className={`fixed z-[9999] flex items-center gap-3 px-4 py-2 rounded-full
                 bg-gray-900/80 backdrop-blur-md border border-white/10 shadow-2xl text-white text-sm select-none
                 ${effectivePosition ? '' : 'top-3 left-1/2 -translate-x-1/2'}`}
    >
      {/* Tay cầm kéo — kéo tự do để tránh che các UI khác (vd. thanh chọn slug),
          double-click để đưa navbar về vị trí mặc định (top-center). Đặt riêng
          để không xung đột với onClick của các nút bên trong (Edit, viewport...).
          draggable={false} + onDragStart preventDefault: chặn ghost-clone của trình
          duyệt xuất hiện khi rê chuột qua vùng text bên trong tay cầm — đây chính là
          nguyên nhân "1 bản clone không có slug" xuất hiện lúc kéo. */}
      <span
        onPointerDown={startDrag}
        onDoubleClick={resetPosition}
        onDragStart={(e) => e.preventDefault()}
        draggable={false}
        role="button"
        aria-label="Drag to move admin Navbar"
        title="Drag to move • Double-click to reset"
        className="material-symbols-outlined text-[16px] text-white/40 cursor-grab
                   transition-colors hover:text-white/80 active:cursor-grabbing select-none"
        style={{ WebkitUserDrag: 'none' } as React.CSSProperties}
      >
        drag_indicator
      </span>

      <span className="w-px h-4 bg-white/20" aria-hidden />

      {/* CMS badge */}
      <span className="flex items-center gap-1.5 font-semibold text-xs tracking-wide uppercase text-white/60">
        <span className="material-symbols-outlined text-[14px] text-indigo-400">dashboard</span>
        CMS
      </span>

      <span className="w-px h-4 bg-white/20" aria-hidden />

      {/* Current slug */}
      {slug && (
        <span className="text-white/50 font-mono text-xs max-w-[160px] truncate" title={`/${slug}`}>
          /{slug}
        </span>
      )}

      {showViewportSwitcher && (
        <>
          <span className="w-px h-4 bg-white/20" aria-hidden />

          <div className="flex items-center gap-0.5" role="group" aria-label="Viewport size">
            {VIEWPORT_PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPreset(p.key)}
                title={p.label}
                aria-pressed={preset === p.key}
                className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
                  preset === p.key
                    ? 'bg-indigo-500 text-white'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">{p.icon}</span>
              </button>
            ))}

            <span className="ml-1 min-w-[52px] text-center text-[11px] tabular-nums text-white/40">
              {activeWidth ? `${Math.round(activeWidth)}px` : 'Full'}
            </span>
          </div>
        </>
      )}

      {canEdit && (
        <>
          <span className="w-px h-4 bg-white/20" aria-hidden />
          <button
            type="button"
            onClick={onToggleEdit}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all
              ${editMode
                ? 'bg-indigo-500 text-white hover:bg-indigo-400'
                : 'bg-white/10 text-white/90 hover:bg-white/20'
              }`}
            aria-pressed={editMode}
          >
            <span className="material-symbols-outlined text-[14px]">
              {editMode ? 'close' : 'edit'}
            </span>
            {editMode ? 'Exit Edit' : 'Edit'}
          </button>
        </>
      )}
    </div>
  );
}