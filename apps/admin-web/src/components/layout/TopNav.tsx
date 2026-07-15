import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/config/cn';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useSidebarStore } from '@/store/sidebar.store';

interface TopNavProps {
  title: string;
  breadcrumb?: { label: string; highlight?: string };
  actions?: ReactNode;
}

export function TopNav({ title, breadcrumb, actions }: TopNavProps) {
  const [openUserMenu, setOpenUserMenu] = useState(false);
  const { logout, user } = useAuth();
  const { roleLabel } = usePermissions();
  const { isCollapsed, toggle } = useSidebarStore();

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : '??';

  const menuRef = useRef<HTMLDivElement>(null);

  // close when click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
        setOpenUserMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <header
      className={cn(
        'fixed top-0 right-0 h-16 bg-surface border-b border-outline-variant shadow-sm flex items-center justify-between px-md z-40 transition-all duration-200',
        isCollapsed ? 'w-full' : 'w-[calc(100%-var(--sidebar-width,240px))]',
      )}
    >
      {/* Left */}
      <div className="flex items-center gap-md !w-[345px] min-w-0">
        <div className="flex items-center gap-sm flex-shrink-0">
          <button
            onClick={toggle}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`
              p-1.5
              transition-all
              duration-300
              flex-shrink-0
              ${
                isCollapsed
                  ? '-ml-4 text-white bg-on-secondary-fixed rounded-r-full rounded-l-none hover:bg-[rgb(26_26_44_/_80%)]'
                  : '-ml-1.5 text-on-surface-variant rounded-full hover:bg-surface-container-high'
              }
            `}
          >
            <span
              className={`
                material-symbols-outlined
                text-[22px]
                transition-transform
                duration-300
                ${isCollapsed ? 'rotate-180' : 'rotate-0'}
              `}
            >
              chevron_left
            </span>
          </button>

          <h3 className="text-h3 font-h3 text-on-surface whitespace-nowrap">
            {title}
          </h3>

          {breadcrumb && (
            <>
              <div className="h-5 w-px bg-outline-variant mx-1" />

              <span className="text-on-surface-variant text-label-md font-label-md hidden sm:block">
                {breadcrumb.label}

                {breadcrumb.highlight && (
                  <>
                    {' / '}
                    <span className="text-primary font-bold">
                      {breadcrumb.highlight}
                    </span>
                  </>
                )}
              </span>
            </>
          )}
        </div>

      </div>

      {actions && (
          <div className="flex items-center w-full !justify-between px-[20px] gap-sm">
            {actions}
          </div>
        )}

      {/* Right */}
      <div className="flex items-center gap-md flex-shrink-0">
        <div className="h-8 w-px bg-outline-variant" />

        {/* User Menu */}
        <div className="relative" ref={menuRef}>
          {/* User pill */}
          <button
            onClick={() => setOpenUserMenu((prev) => !prev)}
            className="flex items-center gap-sm cursor-pointer hover:bg-surface-container-high px-2 py-1 rounded-full transition-all duration-200"
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-label-md flex-shrink-0">
              {initials}
            </div>

            <div className="hidden lg:block text-right">
              <p className="text-label-md font-label-md text-on-surface leading-tight">
                {roleLabel}
              </p>

              <p className="text-[10px] text-on-surface-variant">
                {user?.email ?? '—'}
              </p>
            </div>

            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
              expand_more
            </span>
          </button>

          {/* Dropdown */}
          <div
            className={cn(
              'absolute right-0 top-14 w-56 bg-surface border border-outline-variant rounded-xl shadow-lg overflow-hidden transition-all duration-200 origin-top-right',
              openUserMenu
                ? 'opacity-100 scale-100 visible'
                : 'opacity-0 scale-95 invisible',
            )}
          >
            <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-container transition-colors text-left">
              <span className="material-symbols-outlined text-[20px]">
                person
              </span>

              <span className="text-body-md">View Profile</span>
            </button>

            <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-container transition-colors text-left">
              <span className="material-symbols-outlined text-[20px]">
                edit
              </span>

              <span className="text-body-md">Edit Profile</span>
            </button>

            <div className="h-px bg-outline-variant" />

            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-error transition-colors text-left">
              <span className="material-symbols-outlined text-[20px]">
                logout
              </span>

              <span className="text-body-md font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}