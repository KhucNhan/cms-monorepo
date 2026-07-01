import { NavLink } from 'react-router-dom';
import { cn } from '@/config/cn';
import type { NavItem } from '@/types';

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard',            label: 'Dashboard',            icon: 'dashboard' },
  { path: '/content-manager',      label: 'Content Manager',     icon: 'description' },
  { path: '/block-gallery', label: 'Block Gallery', icon: 'schema' },
  { path: '/media-library',        label: 'Media Library',        icon: 'perm_media' },
  { path: '/settings',             label: 'Settings',             icon: 'settings' },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-sidebar_width bg-on-secondary-fixed flex flex-col z-50">
      {/* Brand */}
      <div className="p-xl flex-shrink-0">
        <h2 className="text-h2 font-h2 text-primary-fixed font-bold leading-tight">
          Admin Dashboard
        </h2>
        <p className="text-secondary-fixed-dim text-body-md mt-sm opacity-70">
          Management Console
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-0">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-4 py-2.5 transition-colors duration-150 cursor-pointer select-none',
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

      {/* Cloud Status */}
      <div className="px-md pb-md mt-auto flex-shrink-0">
        {/* <div className="bg-primary/5 rounded-lg p-md border border-primary/20 mb-md">
          <div className="flex items-center gap-xs mb-1">
            <span className="material-symbols-outlined text-primary text-[16px]">cloud_done</span>
            <span className="text-[10px] font-label-md text-primary-fixed-dim uppercase tracking-wider">
              Cloud Status
            </span>
          </div>
          <p className="text-[12px] text-secondary-fixed-dim">All systems operational.</p>
        </div> */}

        {/* User */}
        {/* <div className="flex items-center gap-sm p-sm bg-white/5 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-label-md flex-shrink-0">
            {MOCK_USER.initials}
          </div>
          <div className="overflow-hidden min-w-0">
            <p className="text-label-md font-label-md text-white truncate">{MOCK_USER.name}</p>
            <p className="text-[10px] text-secondary-fixed-dim uppercase tracking-wider">
              {MOCK_USER.role}
            </p>
          </div>
        </div> */}
      </div>
    </aside>
  );
}