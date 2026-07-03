# AGENTS.md — apps/admin-web

> Đọc `/AGENTS.md` (root) trước nếu chưa đọc.

## Quy ước riêng app này

- **State**: dữ liệu server → TanStack Query (`hooks/use*.ts`). State UI thuần (block đang chọn,
  panel mở, cờ dirty) → Zustand (`editor.store.ts`, `sidebar.store.ts`). **Không** đẩy dữ liệu server vào Zustand store.
- **Chưa có `packages/ui`** — token màu Material You định nghĩa trực tiếp trong
  `tailwind.config.js` của app này. Đừng import từ `@cms/ui`, package đó chưa tồn tại.
- **Tailwind v3.4** (CommonJS `tailwind.config.js`, `theme.extend`) — không dùng cú pháp `@theme`
  của v4.
- **`@cms/block-registry` alias thẳng vào `src/`** qua `vite.config.ts` (`resolve.alias`) — sửa
  block-registry không cần build lại, chỉ cần refresh dev server.
- Block editor mới đăng ký qua `registry.ts`, **không** thêm `switch (block.type)` trong
  `BlockPickerModal.tsx` hay bất kỳ đâu trong app này.
- **Shadcn Migration**: Các thành phần UI cốt lõi được cấu trúc theo triết lý shadcn. Thư mục `components/ui/` chứa `dialog.tsx` và `select.tsx` (sử dụng radix-ui thuần), các component khác như `Button`, `Input`, `Badge`, `Toast` đã được di chuyển sang dạng CVA (class-variance-authority).
- **Sidebar thu gọn**: Quản trị bằng `useSidebarStore`. Toggled qua nút menu bên trong `TopNav.tsx`. Các container chính (`AppLayout`, `TopNav`) tự động điều chỉnh chiều rộng dựa trên `isCollapsed`.
- **Hợp nhất Lịch sử & Set as Draft**:
  - Không còn trang Version Archive riêng biệt.
  - Panel **History** trong `PageEditPage.tsx` hiển thị tất cả các phiên bản của trang. DRAFT và PUBLISHED luôn ghim lên đầu, tiếp đến là danh sách ARCHIVED.
  - DRAFT và ARCHIVED hỗ trợ xóa trực tiếp.
  - Phím **Set as Draft** (thay thế Revert) trên phiên bản ARCHIVED sẽ ghi đè (xóa) DRAFT hiện tại nếu có và tạo ra bản DRAFT mới clone từ phiên bản được chọn.
- **Thư viện ảnh**:
  - Grid phân trang `PAGE_SIZE = 12` (2 dòng, mỗi dòng 6 ảnh).
  - Tên ảnh cho phép nhấp đúp/chỉnh sửa trực tiếp (Inline Rename).
  - Khi xóa ảnh, hệ thống gọi API check usage (`mediaService.getUsages`) quét đệ quy thuộc tính `mediaId` ở mọi block của mọi `pageVersion` (không quan trọng status là gì) và bắt buộc đưa ra cảnh báo chi tiết trước khi xóa.
- **Edit Slug & SEO Metadata**: Cho phép sửa trực tiếp `slug`, `SEO Title`, `SEO Description` ngay trên giao diện chỉnh sửa trang. Các thay đổi này chỉ lưu vào bản DRAFT hiện tại (hoặc fork ra DRAFT mới nếu đang xem bản PUBLISHED) khi bấm **Save Draft**.
- **Roles & Permissions Page** (`pages/roles/RolesPage.tsx`):
  - Layout 2 cột: danh sách role bên trái (kèm số lượng user đang gán), ma trận permission
    (checkbox nhóm theo `resource`) bên phải.
  - **Không dùng modal riêng** cho tạo/sửa permission — khác với `SettingsPage.tsx` (users) vốn
    dùng `UserFormModal`. Rename role và cấp permission là 2 hành động UI riêng biệt trong cùng 1
    panel, khớp với 2 endpoint backend tách biệt (`PATCH /roles/:id` vs `PATCH /roles/:id/permissions`).
  - Quyền `canManage` (ẩn/hiện nút Save, checkbox disable) được tính từ
    `useAuth().user.permissions.includes('role:update')` — `AuthUser.permissions` là `string[]`
    dạng `"resource:action"` lấy nguyên từ JWT (`/auth/me`), **không phải object**. Đây chỉ là UX
    ở FE — bảo mật thật nằm ở `RolesGuard` phía backend.
  - Hook `useRoles.ts` dùng `useState`/`useEffect`/`useCallback` thuần, **không dùng
    `@tanstack/react-query`** — thư viện này không có trong `package.json` của `admin-web`. Toàn bộ
    hook data-fetching trong app (`useMedia.ts`, `useUsers.ts`, `useRoles.ts`) đều theo pattern này,
    tự quản lý state cục bộ, không có cache/invalidate tự động giữa các tab.
  - `roles.api.ts`: `Role.permissions` là `Permission[]` (object `{id, resource, action}`), khác
    hoàn toàn với thiết kế nháp ban đầu (`string[]`) — nhớ đúng shape khi sửa code liên quan.

## Lệnh hay dùng

```bash
pnpm --filter @cms/admin-web dev     # :5173, proxy /api và /uploads sang :3001
pnpm --filter @cms/admin-web build   # tsc -b && vite build
pnpm --filter @cms/admin-web lint
```

## Lưu ý

Canvas preview trong Page Editor tái dùng Renderer từ `block-registry`, nhưng theme Tailwind ở
`apps/web` gần như rỗng → preview hiện **không khớp giao diện thật**. Đây là gap đã biết, không
phải bug component nếu gặp task liên quan.