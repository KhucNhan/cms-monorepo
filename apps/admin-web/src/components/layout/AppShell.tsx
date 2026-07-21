// admin-web/src/components/layout/AppShell.tsx
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { cn } from '@/config/cn';
import { useSidebarStore } from '@/store/sidebar.store';
import { AppLayoutProvider, useAppLayoutHeaderState } from '@/context/AppLayoutContext';

/**
 * Component RIÊNG chỉ để đọc context và render TopNav. Tách khỏi
 * AppShellInner (nơi chứa <Outlet/>) là bắt buộc — nếu gộp chung, mỗi lần
 * setHeader() chạy (từ bất kỳ page nào gọi useAppLayoutHeader), component
 * chứa cả TopNav lẫn <Outlet/> sẽ re-render TOÀN BỘ, kéo theo page con bên
 * trong Outlet re-render theo, page đó lại gọi lại useLayoutEffect (không
 * có dependency) → gọi lại setHeader() → lặp vô hạn ("Maximum update depth
 * exceeded"). Bằng cách để CHỈ component này subscribe context, việc
 * setHeader() chỉ khiến component này re-render — <Outlet/> nằm ở
 * AppShellInner (không subscribe context) sẽ bail-out, không bị ảnh hưởng.
 */
function TopNavConnected() {
  const header = useAppLayoutHeaderState();
  return <TopNav title={header.title} breadcrumb={header.breadcrumb} actions={header.actions} />;
}

function AppShellInner() {
  const isCollapsed = useSidebarStore((s) => s.isCollapsed);
  // ⚠️ KHÔNG gọi useAppLayoutHeaderState() ở đây — xem giải thích trên TopNavConnected.

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Sidebar />
      <TopNavConnected />

      <main
        className={cn(
          'pt-16 min-h-screen transition-all duration-200',
          isCollapsed ? 'ml-0' : 'ml-sidebar_width',
        )}
      >
        <div className="h-full overflow-y-auto custom-scrollbar">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export function AppShell() {
  return (
    <AppLayoutProvider>
      <AppShellInner />
    </AppLayoutProvider>
  );
}