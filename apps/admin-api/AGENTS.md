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
  - **Known perf gap chưa xử lý**: hàm này vẫn load toàn bộ block trong DB (`findMany` không `where`)
    rồi lọc bằng JS đệ quy — nặng dần theo số lượng block. Task tối ưu sau này nên chuyển sang
    Postgres JSONB query (`data @> ...`) để lọc ngay ở DB.
- **Revert to Archived (Set as Draft)**: Endpoint `POST /page-versions/:id/revert` thực hiện xóa DRAFT hiện tại nếu có (cascade blocks) và clone version ARCHIVED đó thành DRAFT mới.
- **Update SEO Meta**: Endpoint `PATCH /page-versions/:id/seo-meta` dùng để update metadata SEO (`title`, `description`) trên các bản DRAFT/ARCHIVED (PUBLISHED bị chặn không được sửa trực tiếp).

## Page Title (mới)

- **`Page` có cột `title` riêng** (`schema.prisma`, migration thêm `ALTER TABLE pages ADD COLUMN
  title TEXT NOT NULL DEFAULT ''`) — **tách biệt hoàn toàn** với `PageVersion.seoMeta.title`
  (thẻ SEO `<title>`). Đừng nhầm lẫn 2 field này khi đọc/sửa code liên quan tới "title".
- `title` sống ở `Page`, **không versioned** — khác với `slug` (cũng ở `Page` nhưng theo quy ước
  hiện tại) và `seoMeta` (ở `PageVersion`, phải qua DRAFT/publish). Hệ quả: update `title` áp dụng
  ngay lập tức, không cần chờ Publish, và **không** tự tạo/fork DRAFT version như khi sửa `seoMeta`.
- Endpoint:
  - `POST /pages` (`createPageSchema`): nhận `title` optional, default `''`. **Không** merge vào
    `seoMeta` như bản cũ (bug đã fix) — lưu thẳng vào cột `Page.title`.
  - `PATCH /pages/:id` (`updatePageSchema`): nhận `slug`/`title` optional độc lập, chỉ patch field
    nào thực sự có mặt trong body (`PagesService.update()`), cùng permission `page:update` như trước
    (không cần thêm permission mới, vì `title` thuộc resource `page` sẵn có).
- **Public API** (`public-pages.controller.ts`, dùng bởi `apps/web`): cả `listPublished()` và
  `getBySlug()` giờ trả `title` theo thứ tự ưu tiên **`page.title` → `seoMeta.title` → `page.slug`**.
  Giữ `seoMeta.title` làm fallback tầng 2 để không phá hiển thị của các page tạo trước migration
  (từng dựa vào bug merge cũ). Không xoá fallback này trừ khi đã backfill `title` cho toàn bộ page
  cũ trong DB.
- **Chưa versioned theo thiết kế hiện tại — cần lưu ý khi review task liên quan tới publish
  lifecycle**: vì `title` update ngay lập tức bất kể trạng thái DRAFT/PUBLISHED, một page đang
  PUBLISHED mà admin sửa `title` rồi bấm "Save Draft" (chưa Publish) sẽ khiến title mới **lộ ra
  public ngay** (khác hành vi của `seoMeta`, vốn chỉ áp dụng sau khi Publish version chứa nó). Đây
  là đánh đổi có chủ đích theo yêu cầu ban đầu ("title là field mới của Page", không phải của
  `PageVersion`) — nếu sau này có task yêu cầu `title` cũng phải versioned giống `seoMeta`, đó là
  thay đổi kiến trúc (di chuyển `title` từ `Page` sang `PageVersion`), không phải bugfix nhỏ.

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
- **Quy tắc bắt buộc: MỌI route trong MỌI controller phải có `@RequirePermissions`**, kể cả các
  route `GET` (list/detail) trước đây hay bị bỏ sót — không có route "public" nào giữa các module
  đã audit (`blocks`, `media`, `pages`, `page-versions`, `users`, `roles`), ngoại trừ
  `public-pages.controller.ts` (route công khai cho `apps/web`, không dùng `@RequirePermissions` vì
  đây là API public phục vụ khách truy cập, không phải admin). Khi thêm controller/route mới, luôn
  tự hỏi "route này thuộc `resource:action` nào trong bảng dưới" trước khi merge, không để route
  trần chỉ dựa vào `JwtAuthGuard` (xác thực) mà thiếu `RolesGuard` + permission (phân quyền).
- **Rà soát gần nhất (đã vá các route thiếu permission)**:
  - `GET /blocks` → `page:read` (trước đó thiếu, chỉ dựa vào JwtAuthGuard).
  - `GET /pages`, `GET /pages/:idOrSlug` → `page:read` (trước đó thiếu).
  - `GET /page-versions` (findDraft), `GET /page-versions/archived` → `page:read` (trước đó thiếu).
  - `PATCH /media/:id/rename` → tạm dùng `media:create` (trước đó thiếu hoàn toàn permission).
    **Đây là workaround, không phải thiết kế đúng** — `PermissionResource` cho `media` hiện chỉ có
    `create | read | delete`, chưa có action `update`. Rename là hành động sửa (update), không phải
    tạo mới, nên dùng tạm `media:create` sẽ gây hiểu nhầm quyền hạn (user có quyền `media:create`
    nhưng không có quyền `media:read`/`delete` vẫn đổi được tên file — có thể không đúng ý đồ RBAC
    gốc). Nếu task sau này cần rename tách quyền riêng với upload, phải: (1) thêm
    `{ resource: 'media', action: 'update' }` vào `ALL_PERMISSIONS` trong `prisma/seed.ts`, (2) chạy
    lại `pnpm --filter admin-api prisma:seed`, (3) đổi decorator ở `MediaController.rename` thành
    `@RequirePermissions('media:update')`. Không tự ý làm việc này ngoài phạm vi task được giao.
- `Permission` trong seed hiện tại (`prisma/seed.ts`, `ALL_PERMISSIONS`) chỉ có 16 permission —
  không có `media:update` và không có `page:read`-riêng-cho-mỗi-route (dùng chung 1 permission
  `page:read` cho mọi route đọc của cả `pages` lẫn `blocks` lẫn `page-versions`, vì cả 3 cùng thuộc
  domain "xem nội dung trang").
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

## Media Optimization (mới — sinh 3 variant ảnh khi upload)

- Dùng thư viện **`sharp`** (free, native binding libvips, không cần license/API key) —
  `apps/admin-api/src/modules/media/image-optimizer.util.ts`.
- Mỗi ảnh raster upload (không áp dụng cho SVG — SVG là vector, bỏ qua toàn bộ pipeline này) sẽ
  sinh **3 variant**, đều convert sang **WebP** và **strip metadata** (EXIF/GPS/camera info — mặc
  định của `sharp` khi KHÔNG gọi `.withMetadata()`, không cần code riêng để strip):
  - **`original`**: cap `maxDimension: 2560`, quality khởi điểm 90, **KHÔNG ép `targetBytes`** —
    ghi đè trực tiếp lên file gốc vừa upload (file thô upload ban đầu **không được giữ lại**, đã
    quyết định đánh đổi để tiết kiệm dung lượng disk).
  - **`detail`**: cap `maxDimension: 1600`, **ép ≤300KB** (`targetBytes: 300 * 1024`) — dự kiến dùng
    cho canvas preview Page Editor, nhưng **CHƯA nối vào FE nào** (field `detailKey`/`detailUrl` đã
    có trong DB, đang chờ task nối UI).
  - **`thumb`**: cap `maxDimension: 400`, ép ≤300KB — dùng cho grid Media Library
    (`admin-web/src/pages/media-library/MediaLibraryPage.tsx`).
- Thuật toán ép `targetBytes` trong `optimizeImage()`: lặp giảm `quality` trước (bước 12, sàn 40),
  hết dư địa quality mới giảm tiếp `maxDimension` (hệ số 0.85), tối đa `MAX_ITERATIONS = 8` vòng để
  tránh loop vô hạn — ưu tiên giữ resolution hơn là giảm quality quá tay.
- `rotateDeg`/`crop` đã có sẵn tham số trong `optimizeImage()` nhưng **CHƯA có endpoint/UI gọi tới**
  — mới dừng ở mức utility function, chưa phải tính năng hoàn chỉnh cho user.
- **Prisma `Media` model** đã thêm 4 field mới (nullable, vì SVG và record cũ trước khi có tính
  năng này sẽ không có): `detailKey`, `detailUrl`, `thumbKey`, `thumbUrl`. Field `width`/`height` là
  field có sẵn từ đầu, không liên quan tới đợt thêm này.
- **`rename()`/`delete()` đã đồng bộ cho cả 3 file variant** — đổi tên/xóa `key` gốc thì cũng đổi
  tên/xóa `detailKey`/`thumbKey` tương ứng trên disk, không để rác file variant mồ côi.
- Cài đặt: `pnpm --filter admin-api add sharp` (đã thêm vào `package.json`).

## Lệnh hay dùng

```bash
pnpm --filter admin-api dev              # :3001
pnpm --filter admin-api build
pnpm --filter admin-api test
pnpm --filter admin-api prisma:generate  # bắt buộc sau khi sửa prisma/schema.prisma
pnpm --filter admin-api prisma:migrate
pnpm --filter admin-api prisma:seed      # ts-node chạy thẳng .ts, không qua build
```

**Lưu ý tên script**: root `package.json` có script `db:migrate`/`db:generate` gọi
`pnpm --filter admin-api prisma migrate dev` / `prisma generate` — đây là tên script SAI, vì
`admin-api/package.json` đặt tên là `prisma:migrate`/`prisma:generate` (có dấu `:`), không phải
`prisma`. Nếu chạy `pnpm db:migrate` từ root mà gặp lỗi "None of the selected packages has a
'prisma' script", đây là nguyên nhân — hoặc sửa lại script root, hoặc luôn gọi trực tiếp
`pnpm --filter admin-api prisma:migrate`.

## Known gap tại chỗ

- `package.json` **không có** field `"prisma": { "seed": "..." }` — chỉ cần thiết nếu dùng
  `prisma migrate reset` (lệnh này tự tìm field đó để chạy seed sau reset). Nếu luôn gọi trực tiếp
  `pnpm prisma:seed` như hiện tại thì **không bắt buộc** phải thêm field này, khác với mô tả gốc ở
  root AGENTS.md mục 4 — chỉ thêm khi thực sự cần `migrate reset`.
- Global prefix `/api/v1` áp dụng cho toàn bộ controller — khi test bằng Swagger/Postman, path
  luôn có tiền tố này (ví dụ `POST /api/v1/roles`, không phải `POST /roles`).
- **`media:update` chưa tồn tại trong `PermissionResource`/seed** — xem mục RBAC phía trên,
  `PATCH /media/:id/rename` đang tạm mượn `media:create`. Đây là gap cần dọn khi có task RBAC media
  rõ ràng hơn.
- **`detailUrl` chưa được nối vào bất kỳ UI/consumer nào** — field đã tồn tại trong DB và được sinh
  ra lúc upload, nhưng chưa có chỗ nào (canvas preview, block editor...) thực sự dùng tới. Không
  phải bug nếu gặp task liên quan tới preview ảnh medium-size.
- **`Page.title` chưa được backfill cho các page tạo trước migration** — các page cũ có
  `title = ''` (default), UI/API đều fallback về `slug` hoặc `seoMeta.title` khi hiển thị (xem mục
  "Page Title" phía trên), nhưng dữ liệu thật trong cột `title` vẫn rỗng cho tới khi admin vào sửa
  tay. Không phải bug, chỉ là chưa có script backfill.

## CORS khi deploy multi-subdomain

Khi `admin-web` và `admin-api` chạy ở 2 subdomain khác nhau (ví dụ `admin.` và `api.`), phải khai báo `CORS_ORIGIN` trong `.env` với đầy đủ domain cách nhau bằng dấu phẩy, không khoảng trắng. `app.enableCors()` trong `main.ts` cũng phải khai báo tường minh `methods` (bao gồm `PATCH`, `DELETE`) — nếu để mặc định, preflight có thể chặn các method này dù origin đã đúng, gây lỗi CORS khó debug. Chi tiết xem `DEPLOYMENT.md` ở root.