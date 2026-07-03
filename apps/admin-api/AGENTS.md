# AGENTS.md — apps/admin-api

> Đọc `/AGENTS.md` (root) trước nếu chưa đọc.

## Quy ước riêng app này

- **KHÔNG dùng repository pattern trong thực tế** (khác tài liệu kiến trúc gốc) — mọi Prisma query
  gọi thẳng `this.prisma.<model>.xxx()` trong `*.service.ts` (`UsersService`, `MediaService`,
  `RolesService`...). Giữ nguyên pattern này khi thêm module mới, xem root AGENTS.md mục 1.1.
- **Response envelope** (`common/interceptors/response.interceptor.ts`):
  `{ success: true, data, meta? }` hoặc `{ success: false, error: { code, message, details } }`.
  Không return raw object/array từ controller.
- **Validate `blocks.data` bằng Zod từ `@cms/block-registry`** ở `BlocksService.validateBlockData()`.
  Không thêm class-validator decorator song song cho field JSONB này.
- **Không render HTML** — chỉ trả JSON. Task "làm block đẹp hơn" không thuộc app này.
- **Publish** = update `pages.publishedVersionId`, không UPDATE trực tiếp version đang published.
- **Media Check Usages**: `MediaService.findUsages()` quét đệ quy mọi block trong cơ sở dữ liệu để tìm `mediaId` bên trong JSONB `data` bất kể trạng thái `pageVersion.status` (DRAFT/PUBLISHED/ARCHIVED). Khi thêm các trường lưu trữ media mới, luôn đặt key là `mediaId` để cơ chế tự động quét phát hiện.
- **Revert to Archived (Set as Draft)**: Endpoint `POST /page-versions/:id/revert` thực hiện xóa DRAFT hiện tại nếu có (cascade blocks) và clone version ARCHIVED đó thành DRAFT mới.
- **Update SEO Meta**: Endpoint `PATCH /page-versions/:id/seo-meta` dùng để update metadata SEO (`title`, `description`) trên các bản DRAFT/ARCHIVED (PUBLISHED bị chặn không được sửa trực tiếp).

## RBAC — Roles & Permissions (`modules/roles/`)

- Model thật trong Prisma: `Role` — `Permission` — `RolePermission` (bảng nối many-to-many,
  `@@id([roleId, permissionId])`). **Field quan hệ trên `Role` tên là `rolePermissions`**, không
  phải `permissions` — dễ gõ sai vì `shared-types.Role.permissions` (DTO trả về FE) lại đặt tên
  khác với field Prisma thật, đừng nhầm 2 cái này.
- `Permission` là cặp atomic `{ resource, action }`, unique theo `[resource, action]`.
  `PermissionResource` hợp lệ: `'page' | 'media' | 'user' | 'role'` (số ít, không phải số nhiều —
  xem `packages/shared-types/src/index.ts`). `PermissionAction`: `'create' | 'read' | 'update' |
  'delete' | 'publish'`.
- Guard dùng chung `RolesGuard` + decorator `@RequirePermissions('resource:action')`
  (`modules/auth/guards/roles.guard.ts`) — check thẳng trên `JwtPayload.permissions: Permission[]`
  đã embed sẵn lúc login, **không query DB mỗi request**.
- Endpoint (`roles.controller.ts`, prefix thật `/api/v1/roles`):
  - `GET /roles` — `role:read` — list role kèm permissions + userCount.
  - `GET /roles/permissions/list` — `role:read` — list toàn bộ permission có thể gán (không phải
    `/roles/permissions`, tránh nhầm với `GET /users/roles/list` đã có sẵn ở `UsersController`).
  - `POST /roles` — `role:create`.
  - `PATCH /roles/:id` — `role:update` — chỉ đổi tên.
  - `PATCH /roles/:id/permissions` — `role:update` — ghi đè toàn bộ set permission của role (xoá
    hết `RolePermission` cũ rồi tạo lại trong 1 transaction) — đây là hành động "grant permission".
  - `DELETE /roles/:id` — `role:delete` — chặn nếu còn user đang gán role đó (`ConflictException`).
- Seed permission + gán mặc định cho `admin | editor | viewer` nằm ở `prisma/seed.ts`
  (`ALL_PERMISSIONS`, `ROLE_PERMISSIONS`) — chạy bằng `pnpm --filter admin-api prisma:seed`.

## Lệnh hay dùng

```bash
pnpm --filter admin-api dev              # :3001
pnpm --filter admin-api build
pnpm --filter admin-api test
pnpm --filter admin-api prisma:generate  # bắt buộc sau khi sửa prisma/schema.prisma
pnpm --filter admin-api prisma:migrate
pnpm --filter admin-api prisma:seed      # ts-node chạy thẳng .ts, không qua build
```

## Known gap tại chỗ

- `package.json` **không có** field `"prisma": { "seed": "..." }` — chỉ cần thiết nếu dùng
  `prisma migrate reset` (lệnh này tự tìm field đó để chạy seed sau reset). Nếu luôn gọi trực tiếp
  `pnpm prisma:seed` như hiện tại thì **không bắt buộc** phải thêm field này, khác với mô tả gốc ở
  root AGENTS.md mục 4 — chỉ thêm khi thực sự cần `migrate reset`.
- Global prefix `/api/v1` áp dụng cho toàn bộ controller — khi test bằng Swagger/Postman, path
  luôn có tiền tố này (ví dụ `POST /api/v1/roles`, không phải `POST /roles`).