import { type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  breadcrumb?: { label: string; highlight?: string };
  actions?: ReactNode;
}

export function AppLayout({ children, title, breadcrumb, actions }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Sidebar />
      <TopNav title={title} breadcrumb={breadcrumb} actions={actions} />

      <main className="ml-sidebar_width pt-16 min-h-screen">
        <div className="h-full overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
}
