import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/config/cn';
import type { NavItem } from '@/types';
import { useSidebarStore } from '@/store/sidebar.store';
import { templatesApi } from '@/api/templates.api';

const STATIC_NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: '/content-management', label: 'Pages', icon: 'description' },
];

const REST_NAV_ITEMS: NavItem[] = [
  { path: '/block-gallery', label: 'Block Gallery', icon: 'schema' },
  { path: '/media-library', label: 'Media Library', icon: 'perm_media' },
  { path: '/users', label: 'Users', icon: 'group' },
  { path: '/roles', label: 'Roles', icon: 'policy' },
  { path: '/templates', label: 'Manage Templates', icon: 'view_carousel' },
];

// Parses a NavItem's `path` into { pathname, templateId } once, so active-state
// comparison below doesn't re-parse the string on every render.
function parseNavPath(path: string): { pathname: string; templateId: string | null } {
  const [pathname, query] = path.split('?');
  const templateId = query ? new URLSearchParams(query).get('templateId') : null;
  return { pathname, templateId };
}

export function Sidebar() {
  const isCollapsed = useSidebarStore((s) => s.isCollapsed);
  const [templateNavItems, setTemplateNavItems] = useState<NavItem[]>([]);
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    templatesApi
      .list()
      .then((templates) => {
        if (cancelled) return;
        setTemplateNavItems(
          templates.map((t) => ({
            path: `/content-management?templateId=${t.id}`,
            label: t.slugPrefix.charAt(0).toUpperCase() + t.slugPrefix.slice(1),
            icon: 'folder_copy',
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setTemplateNavItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const NAV_ITEMS: NavItem[] = [...STATIC_NAV_ITEMS, ...templateNavItems, ...REST_NAV_ITEMS];

  // Current URL's own templateId — null when the query param is absent
  // (i.e. viewing the static "Pages" tab), matching PageFilters convention
  // used by usePages()/ContentManagementPage.
  const currentTemplateId = new URLSearchParams(location.search).get('templateId');

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-on-secondary-fixed flex flex-col z-50 transition-all duration-200 overflow-hidden',
        isCollapsed ? 'w-0' : 'w-sidebar_width',
      )}
    >
      <h1 className="self-center text-[24px] text-white py-[12px]">Khuc Chi Nhan</h1>
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-0 pt-0">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const { pathname, templateId } = parseNavPath(item.path);
            // Active requires BOTH matching pathname AND matching templateId
            // (null === null for "Pages", exact id match for a template tab).
            // This is what NavLink's default pathname-only match was missing.
            const isActive =
              location.pathname === pathname && currentTemplateId === templateId;

            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 whitespace-nowrap transition-colors duration-150 cursor-pointer select-none',
                    isActive
                      ? 'border-l-4 border-primary bg-primary/10 text-primary-fixed-dim'
                      : 'border-l-4 border-transparent text-secondary-fixed-dim hover:text-primary-fixed hover:bg-primary/5',
                  )}
                >
                  <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                  <span className="text-body-md">{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}