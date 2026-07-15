import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { AuthProvider } from '@/components/edit-mode/AuthProvider';
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
          {/* ViewportProvider bọc CẢ NavbarSwitcher (AdminNavbar, mount trong page.tsx)
             lẫn {children} (nơi EditModeLayout/PagePreview mount) — 2 nhánh này là anh em
             trong cây component, không có quan hệ cha-con, nên cần 1 context chung ở tầng
             cao hơn thay vì prop-drilling. Xem components/edit-mode/ViewportContext.tsx. */}
          <ViewportProvider>
            {/* KHÔNG render <NavbarSwitcher /> ở đây — layout.tsx bao mọi route nên không
               có pageId/slug/initialBlocks của từng trang. NavbarSwitcher CHỈ được mount
               ở app/[slug]/page.tsx (có đủ props thật). Từng có bug: cả 2 nơi cùng render
               NavbarSwitcher → 2 AdminNavbar chồng lên nhau ở cùng vị trí mặc định, bản ở
               đây thiếu slug vì không có props → khi kéo thanh admin, chỉ 1 trong 2 DOM
               node di chuyển, lộ ra bản còn lại như một "bản clone không có tên slug".
               Nếu cần AdminNavbar xuất hiện trên các route không có page.tsx riêng (404,
               error page...), đó là một nhu cầu khác — xử lý bằng cách truyền props hợp lệ
               (hoặc ẩn hẳn), không phải render trùng NavbarSwitcher như cũ. */}
            <Navbar />
            {children}
          </ViewportProvider>
        </AuthProvider>
      </body>
    </html>
  );
}