import { NavLink } from 'react-router-dom';
import { cn } from '@/config/cn';
import type { NavItem } from '@/types';
import { useSidebarStore } from '@/store/sidebar.store';

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard',           label: 'Dashboard',           icon: 'dashboard' },
  { path: '/content-management', label: 'Content Management', icon: 'description' },
  { path: '/block-gallery',       label: 'Block Gallery',       icon: 'schema' },
  { path: '/media-library',       label: 'Media Library',       icon: 'perm_media' },
  { path: '/users',               label: 'Users',               icon: 'group' },
  { path: '/roles',               label: 'Roles',               icon: 'policy' },
];

export function Sidebar() {
  const isCollapsed = useSidebarStore((s) => s.isCollapsed);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-on-secondary-fixed flex flex-col z-50 transition-all duration-200 overflow-hidden',
        isCollapsed ? 'w-0' : 'w-sidebar_width',
      )}
    >
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-0 pt-0">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-4 py-2.5 whitespace-nowrap transition-colors duration-150 cursor-pointer select-none',
                    isActive
                      ? 'border-l-4 border-primary bg-primary/10 text-primary-fixed-dim'
                      : 'border-l-4 border-transparent text-secondary-fixed-dim hover:text-primary-fixed hover:bg-primary/5',
                  )
                }
              >
                <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                <span className="text-body-md">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}