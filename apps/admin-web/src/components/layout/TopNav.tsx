import { useEffect, useRef, useState } from 'react';
import { cn } from '@/config/cn';
import { useAuth } from '@/hooks/useAuth';

interface TopNavProps {
  title: string;
  breadcrumb?: { label: string; highlight?: string };
  actions?: React.ReactNode;
}

export function TopNav({ title, breadcrumb, actions }: TopNavProps) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [openUserMenu, setOpenUserMenu] = useState(false);
  const { logout } = useAuth();

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
    <header className="fixed top-0 right-0 w-[calc(100%-240px)] h-16 bg-surface border-b border-outline-variant shadow-sm flex items-center justify-between px-md z-40">
      {/* Left */}
      <div className="flex items-center gap-md flex-1 min-w-0">
        <div className="flex items-center gap-sm flex-shrink-0">
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

        {/* Search */}
        <div
          className={cn(
            'max-w-md relative group transition-all duration-200',
            searchFocused ? 'w-96' : 'w-64',
          )}
        >
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px] transition-colors group-focus-within:text-primary pointer-events-none">
            search
          </span>

          <input
            type="text"
            placeholder="Search for content..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg pl-10 pr-4 py-2 text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-md flex-shrink-0">
        {actions && (
          <div className="flex items-center gap-sm">
            {actions}
          </div>
        )}

        {/* Icons */}
        {/* <div className="flex items-center gap-1">
          <button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-all duration-200 relative">
            <span className="material-symbols-outlined text-[22px]">
              notifications
            </span>

            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-surface" />
          </button>

          <button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-all duration-200">
            <span className="material-symbols-outlined text-[22px]">
              help
            </span>
          </button>
        </div> */}

        <div className="h-8 w-px bg-outline-variant" />

        {/* User Menu */}
        <div className="relative" ref={menuRef}>
          {/* User pill */}
          <button
            onClick={() => setOpenUserMenu((prev) => !prev)}
            className="flex items-center gap-sm cursor-pointer hover:bg-surface-container-high px-2 py-1 rounded-full transition-all duration-200"
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-label-md flex-shrink-0">
              AR
            </div>

            <div className="hidden lg:block text-right">
              <p className="text-label-md font-label-md text-on-surface leading-tight">
                Admin User
              </p>

              <p className="text-[10px] text-on-surface-variant">
                Super Administrator
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