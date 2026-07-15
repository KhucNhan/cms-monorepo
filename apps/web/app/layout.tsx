import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { AuthProvider } from '@/components/edit-mode/AuthProvider';
import { NavbarSwitcher } from '@/components/NavbarSwitcher';
import './globals.css';
import { ViewportProvider } from '@/components/edit-mode/ViewportContext';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'CMS Site',
  description: 'Public site powered by CMS',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        {/* AuthProvider phải bọc NGOÀI CÙNG các phần cần biết trạng thái admin —
           chỉ check ở Client Component, KHÔNG đọc cookie ở đây (Server Component)
           để giữ app/[slug]/page.tsx static-renderable (root AGENTS.md 1.6 / apps/web AGENTS.md). */}
        <AuthProvider>
          {/* ViewportProvider bọc CẢ NavbarSwitcher (AdminNavbar) lẫn {children} (nơi
             EditModeLayout/PagePreview mount) — 2 nhánh này là anh em trong cây component,
             không có quan hệ cha-con, nên cần 1 context chung ở tầng cao hơn thay vì
             prop-drilling. Xem components/edit-mode/ViewportContext.tsx. */}
          <ViewportProvider>
            {/* Chưa có pageId/slug/initialBlocks ở tầng layout (layout bao mọi route,
               không có dữ liệu của từng page) — nên AdminNavbar sẽ hiện nhưng KHÔNG hiển thị
               slug và nút "Edit" sẽ không mở được EditModeLayout (thiếu pageId).
               Muốn Edit Mode hoạt động đầy đủ trên từng trang, xem ghi chú bên dưới để
               chuyển NavbarSwitcher xuống app/[slug]/page.tsx thay vì layout.tsx. */}
            <NavbarSwitcher />
            <Navbar />
            {children}
          </ViewportProvider>
        </AuthProvider>
      </body>
    </html>
  );
}