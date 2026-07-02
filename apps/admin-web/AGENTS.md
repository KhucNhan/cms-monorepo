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