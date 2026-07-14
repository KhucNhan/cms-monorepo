import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { AuthProvider } from '@/components/edit-mode/AuthProvider';
import { NavbarSwitcher } from '@/components/NavbarSwitcher';
import './globals.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'CMS Site',
  description: 'Public site powered by CMS',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        {/* AuthProvider phải bọc NGOÀI CÙNG các phần cần biết trạng thái admin —
           chỉ check ở Client Component, KHÔNG đọc cookie ở đây (Server Component)
           để giữ app/[slug]/page.tsx static-renderable (root AGENTS.md 1.6 / apps/web AGENTS.md). */}
        <AuthProvider>
          {/* Chưa có pageId/slug/initialBlocks ở tầng layout (layout bao mọi route,
             không có dữ liệu của từng page) — nên AdminNavbar sẽ hiện nhưng KHÔNG hiển thị
             slug và nút "Edit" sẽ không mở được EditModeLayout (thiếu pageId).
             Muốn Edit Mode hoạt động đầy đủ trên từng trang, xem ghi chú bên dưới để
             chuyển NavbarSwitcher xuống app/[slug]/page.tsx thay vì layout.tsx. */}
          <NavbarSwitcher />
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}