import { type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { cn } from '@/config/cn';
import { useSidebarStore } from '@/store/sidebar.store';

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  breadcrumb?: { label: string; highlight?: string };
  actions?: ReactNode;
}

export function AppLayout({ children, title, breadcrumb, actions }: AppLayoutProps) {
  const isCollapsed = useSidebarStore((s) => s.isCollapsed);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Sidebar />
      <TopNav title={title} breadcrumb={breadcrumb} actions={actions} />

      <main
        className={cn(
          'pt-16 min-h-screen transition-all duration-200',
          isCollapsed ? 'ml-0' : 'ml-sidebar_width',
        )}
      >
        <div className="h-full overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
}