'use client';

import { useAuth } from './edit-mode/AuthProvider';

interface AdminNavbarProps {
  /** Current page slug — shown in the admin bar for context */
  slug?: string;
  /** Whether edit mode is currently active */
  editMode: boolean;
  onToggleEdit: () => void;
}

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

  return (
    <div
      role="banner"
      aria-label="Admin toolbar"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-2 rounded-full
                 bg-gray-900/80 backdrop-blur-md border border-white/10 shadow-2xl text-white text-sm select-none"
    >
      {/* CMS badge */}
      <span className="flex items-center gap-1.5 font-semibold text-xs tracking-wide uppercase text-white/60">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <rect width="12" height="12" rx="3" fill="#6366f1" />
          <path d="M3 6h6M6 3v6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        CMS
      </span>

      <span className="w-px h-4 bg-white/20" aria-hidden />

      {/* Current slug */}
      {slug && (
        <span className="text-white/50 font-mono text-xs max-w-[160px] truncate" title={`/${slug}`}>
          /{slug}
        </span>
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
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {editMode
                ? <path d="M18 6L6 18M6 6l12 12" />
                : <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></>
              }
            </svg>
            {editMode ? 'Exit Edit' : 'Edit'}
          </button>
        </>
      )}
    </div>
  );
}
