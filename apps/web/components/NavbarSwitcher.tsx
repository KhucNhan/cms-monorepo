'use client';

import { useState } from 'react';
import { useAuth } from './edit-mode/AuthProvider';
import { AdminNavbar } from './AdminNavbar';
import { EditModeLayout } from './edit-mode/EditModeLayout';

interface NavbarSwitcherProps {
  /** Passed down from the page — pageId for API calls, slug for display */
  pageId?: string;
  slug?: string;
  /** Initial blocks from the Server Component render — used as draft baseline in edit mode */
  initialBlocks?: import('@/types').Block[];
}

/**
 * NavbarSwitcher — Client Component.
 *
 * Renders:
 * - For anonymous visitors / non-admins: nothing extra (public Navbar is already in layout.tsx)
 * - For authenticated admins: floating AdminNavbar + optionally the EditModeLayout overlay
 *
 * This component is intentionally lightweight — it only reads auth context and toggles
 * edit mode state. All heavy edit-mode UI is lazy (rendered conditionally).
 */
export function NavbarSwitcher({ pageId, slug, initialBlocks = [] }: NavbarSwitcherProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [editMode, setEditMode] = useState(false);

  // Don't render anything during initial auth check to avoid layout shift
  if (isLoading || !isAuthenticated) return null;

  return (
    <>
      <AdminNavbar
        slug={slug}
        editMode={editMode}
        onToggleEdit={() => setEditMode((v) => !v)}
      />
      {editMode && pageId && (
        <EditModeLayout
          pageId={pageId}
          slug={slug ?? ''}
          initialBlocks={initialBlocks}
          onClose={() => setEditMode(false)}
        />
      )}
    </>
  );
}
