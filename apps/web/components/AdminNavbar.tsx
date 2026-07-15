'use client';

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

  return (
    <div
      role="banner"
      aria-label="Admin toolbar"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-2 rounded-full
                 bg-gray-900/80 backdrop-blur-md border border-white/10 shadow-2xl text-white text-sm select-none"
    >
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