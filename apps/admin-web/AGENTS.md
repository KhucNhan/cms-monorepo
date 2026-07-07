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
  - **Media Optimization (mới)**: mỗi ảnh raster upload (trừ SVG) được BE sinh sẵn 3 biến thể WebP
    ≤300KB — `original`, `detail`, `thumb` (xem chi tiết thuật toán ở `apps/admin-api/AGENTS.md`
    mục "Media Optimization"). Grid trong `MediaLibraryPage.tsx` render `<img src={item.thumbUrl ??
    item.url} loading="lazy" />` — ưu tiên `thumbUrl`, fallback về `url` gốc cho record cũ (upload
    trước khi có tính năng này, `thumbUrl` sẽ là `null`). Nút xem chi tiết/"mở tab mới" vẫn dùng
    `url` gốc (cũng đã được tối ưu ≤300KB, không phải file thô upload nữa).
  - `detailUrl`/`detailKey` đã có trong response `MediaItem` nhưng **chưa được dùng ở component
    nào** trong app này — dự kiến dùng cho canvas preview Page Editor sau này, chưa làm.
- **Edit Slug & SEO Metadata**: Cho phép sửa trực tiếp `slug`, `SEO Title`, `SEO Description` ngay trên giao diện chỉnh sửa trang. Các thay đổi này chỉ lưu vào bản DRAFT hiện tại (hoặc fork ra DRAFT mới nếu đang xem bản PUBLISHED) khi bấm **Save Draft**.
- **Roles & Permissions Page** (`pages/roles/RolesPage.tsx`):
  - Layout 2 cột: danh sách role bên trái (kèm số lượng user đang gán), ma trận permission
    (checkbox nhóm theo `resource`) bên phải.
  - **Không dùng modal riêng** cho tạo/sửa permission — khác với `SettingsPage.tsx` (users) vốn
    dùng `UserFormModal`. Rename role và cấp permission là 2 hành động UI riêng biệt trong cùng 1
    panel, khớp với 2 endpoint backend tách biệt (`PATCH /roles/:id` vs `PATCH /roles/:id/permissions`).
  - Quyền `canManage` giờ tính qua `usePermissions().can('role:update')` (xem mục RBAC frontend bên
    dưới), không còn tự `useMemo` đọc thẳng `user.permissions.includes(...)` như bản cũ.
  - Hook `useRoles.ts` dùng `useState`/`useEffect`/`useCallback` thuần, **không dùng
    `@tanstack/react-query`** — thư viện này không có trong `package.json` của `admin-web`. Toàn bộ
    hook data-fetching trong app (`useMedia.ts`, `useUsers.ts`, `useRoles.ts`) đều theo pattern này,
    tự quản lý state cục bộ, không có cache/invalidate tự động giữa các tab.
  - `roles.api.ts`: `Role.permissions` là `Permission[]` (object `{id, resource, action}`), khác
    hoàn toàn với thiết kế nháp ban đầu (`string[]`) — nhớ đúng shape khi sửa code liên quan.

## RBAC Frontend (mới thêm)

- **Một nguồn auth state duy nhất: `context/AuthContext.tsx`.** Trước đây tồn tại song song
  `hooks/useAuth.ts` với cùng logic (2 `useState` độc lập không đồng bộ) — `LoginPage.tsx`,
  `RolesPage.tsx`, `TopNav.tsx` từng import nhầm bản hook trong khi `App.tsx`/`ProtectedRoute.tsx`
  dùng bản Context, khiến login xong `isAuthenticated` ở `ProtectedRoute` không được cập nhật.
  `hooks/useAuth.ts` đã bị xoá — **luôn import `useAuth` từ `@/context/AuthContext`**, không tạo lại
  hook trùng tên ở nơi khác.
- **`hooks/usePermissions.ts`**: hook trung tâm, đọc `user.permissions: string[]` (dạng
  `"resource:action"`, y hệt string dùng trong `@RequirePermissions()` ở `admin-api`) từ
  `AuthContext`, không tạo thêm state hay gọi thêm API. API: `can(permission)`, `canAny([...])`,
  `canAll([...])`.
- **`components/Can.tsx`**: gate khai báo dùng trong JSX — `<Can permission="role:delete">...</Can>`,
  hỗ trợ `anyOf`/`allOf`/`fallback`. Đặt phẳng ngang cấp `ProtectedRoute.tsx` trong `components/`,
  không tạo subfolder riêng cho 1 file.
- Đây là lớp UX/security-in-depth ở frontend — **backend (`RolesGuard` + `@RequirePermissions`) vẫn
  là nguồn sự thật duy nhất**; ẩn/disable nút ở FE không thay thế permission check ở BE.
- Đã áp dụng `Can` cho các "dangerous action": tạo/xoá role (`RolesPage.tsx`), tạo/sửa/xoá user
  (`UsersManagementPage.tsx`), tạo/xoá page (`ContentManagementPage.tsx`), xoá block
  (`BlockSectionCard.tsx`), Save Draft / Publish / Add Block / Set as Draft / xoá version
  (`PageEditPage.tsx`), upload/rename/xoá media (`MediaLibraryPage.tsx`).
  - Rename media hiện tạm dùng permission `media:create` (không phải `media:update`) để khớp đúng
    workaround đang có ở backend — xem `apps/admin-api/AGENTS.md` mục RBAC, `media:update` chưa tồn
    tại trong `PermissionResource`.
- **`TopNav.tsx`**: user pill không còn hardcode "Admin User / Super Administrator" — hiển thị email
  thật từ `AuthContext` và nhãn role suy ra từ tập permissions qua `usePermissions()` (do
  `AuthUser`/JWT hiện chỉ có `roleId`, chưa trả role name — nếu sau này backend thêm role name vào
  `/auth/me`, nên đổi lại lấy trực tiếp thay vì suy luận qua permission set).

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

## Deploy production — proxy KHÔNG hoạt động ở preview mode

`server.proxy` trong `vite.config.ts` chỉ hoạt động khi chạy `vite dev`, **không hoạt động** khi chạy `vite preview` (dùng để serve production build khi deploy). Vì `src/api/client.ts` dùng đường dẫn tương đối (`BASE_URL`), khi deploy qua domain thật, phải đọc `VITE_API_URL` từ `.env.production` trỏ thẳng vào domain của `admin-api` (ví dụ `https://api.khucnhan.io.vn/api/v1`), nếu không toàn bộ API call sẽ 404. Chi tiết đầy đủ xem `DEPLOYMENT.md` ở root.

Vite 6 `preview` mặc định chặn host lạ — khi map domain qua Cloudflare Tunnel hoặc reverse proxy khác, phải thêm domain vào `preview.allowedHosts` trong `vite.config.ts`.