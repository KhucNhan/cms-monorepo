# AGENTS.md

Hướng dẫn cho AI coding agent (Claude Code, Cursor, v.v.) làm việc trong repo này.
Đọc file này **trước** khi sửa bất cứ thứ gì — phần lớn bug trong hệ thống này đến từ việc
phá vỡ một trong các invariant ở mục 1, không phải từ logic sai.

## 0. Repo này là gì (1 phút)

CMS nội bộ, kiến trúc Page + Block Builder, 3 app độc lập chia sẻ 1 package trung tâm:

| App | Path | Stack | Port dev |
|---|---|---|---|
| Admin API | `apps/admin-api` | NestJS 11 + Fastify + Prisma 6 + Zod | 3001 |
| Admin Web | `apps/admin-web` | React 19 + Vite 6 + Tailwind 3 | 5173 |
| Web (public) | `apps/web` | Next.js 15 App Router | 3000 |

`packages/block-registry` là **nguồn sự thật duy nhất** cho mọi loại block (Hero, FAQ, Rich Text...).
Nếu một task đụng tới "thêm/sửa field của block" → luôn bắt đầu và kết thúc ở package này,
không sửa dữ liệu ở 3 app riêng lẻ.

### 0.1 Đang sửa gì? Đọc thêm file cục bộ tương ứng — KHÔNG cần đọc hết repo

| Đang sửa | Đọc thêm |
|---|---|
| NestJS / API / Prisma / auth | `apps/admin-api/AGENTS.md` |
| React/Vite admin UI | `apps/admin-web/AGENTS.md` |
| Next.js public site | `apps/web/AGENTS.md` |
| Thêm/sửa block type | `packages/block-registry/AGENTS.md` |
| Muốn hiểu "tại sao" kiến trúc thế này | `ARCHITECTURE-DESIGN.md` |

Root AGENTS.md chỉ chứa invariant chung, lệnh, known gaps, quy ước code, checklist — không lặp
lại ở các file cục bộ.

## 1. Invariant — KHÔNG được vi phạm

Vi phạm các điều dưới đây gây drift giữa 3 app, là loại bug khó debug nhất trong hệ thống này.
Giải thích chi tiết "vì sao" từng invariant: xem `ARCHITECTURE-DESIGN.md`.

- Không import React, không import gì từ NestJS trong `packages/block-registry/src/blocks/*/schema.ts`
  (chi tiết & ví dụ: `packages/block-registry/AGENTS.md`).
- Không viết `switch (block.type)` hay `if (type === 'hero')` ở bất kỳ đâu ngoài
  `packages/block-registry/src/registry.ts` — luôn gọi `getBlockDefinition(type)`
  (chi tiết & ví dụ: `packages/block-registry/AGENTS.md`).
- NestJS không bao giờ render HTML, `admin-api` chỉ trả JSON (chi tiết: `apps/admin-api/AGENTS.md`).
- `blocks.data` (JSONB) luôn validate bằng Zod schema từ `block-registry` ở
  `BlocksService.validateBlockData()` trước khi ghi DB — không thêm class-validator decorator song song.
- Publish = đổi `pages.publishedVersionId`, không bao giờ UPDATE trực tiếp lên bản đang published.
- `apps/web` không bao giờ query Postgres trực tiếp — mọi dữ liệu lấy qua Admin API
  (`lib/cms-client.ts`); nếu thấy import Prisma trong `apps/web`, đó là lỗi kiến trúc, báo lại.

## 2. Lệnh thao tác theo workspace

Toàn bộ chạy từ root bằng Turborepo, filter theo **tên trong `package.json` của từng app**
(chú ý: `admin-api` không có scope `@cms/`, còn `admin-web` và `web` có):

```bash
pnpm dev                                 # chạy cả 3 app song song
pnpm --filter admin-api dev              # chỉ NestJS      → :3001
pnpm --filter @cms/admin-web dev         # chỉ React/Vite  → :5173
pnpm --filter @cms/web dev               # chỉ Next.js     → :3000

pnpm build                               # turbo build toàn repo, tôn trọng dependency graph (^build)
pnpm lint                                # turbo lint toàn repo
pnpm test                                # turbo test toàn repo

pnpm db:generate                         # prisma generate (chạy lại sau MỌI thay đổi schema.prisma)
pnpm db:migrate                          # prisma migrate dev — tạo migration mới + apply
pnpm db:seed                             # xem mục 4 "known gap" trước khi chạy lệnh này
pnpm db:studio                           # GUI xem DB tại :5555
```

Sau khi sửa `packages/block-registry` hoặc `packages/shared-types`, **không cần build package** để
`admin-web`/`web` thấy thay đổi trong dev — cả hai đều alias thẳng vào `src/` (xem `vite.config.ts`
`alias['@cms/block-registry']` và `next.config.ts` `transpilePackages`). Chỉ `admin-api` build ra `dist/`
mới cần `pnpm --filter admin-api build` nếu test bằng bản build thật thay vì `nest start --watch`.

## 3. Thêm một block type mới

Đây là thao tác phổ biến nhất trong repo. Checklist đầy đủ (5-6 bước, thứ tự cụ thể, kèm lưu ý
"không sửa file nào") đã nằm ở `packages/block-registry/AGENTS.md` — đọc ở đó, không lặp lại
nguyên văn ở root để tránh hai bản lệch nhau theo thời gian.

## 4. Known gaps — đã biết, đừng "sửa" mù quáng theo đúng tài liệu kiến trúc gốc

Tài liệu thiết kế kiến trúc gốc (kiến trúc "mục tiêu") đi trước code thật một vài bước. Trước khi
giả định thứ gì tồn tại, kiểm tra thực tế:

- **`admin-api/package.json` thiếu field `"prisma": { "seed": "ts-node prisma/seed.ts" }`.**
  Nếu `pnpm db:seed` báo lỗi "no seed script defined" — đây là nguyên nhân, không phải lỗi DB.
  Fix: thêm vào `apps/admin-api/package.json`:
  ```json
  "prisma": { "seed": "ts-node prisma/seed.ts" }
  ```
- **`packages/form-engine`, `packages/ui`, `packages/api-client`, `packages/eslint-config` được mô tả
  trong tài liệu kiến trúc nhưng chưa xuất hiện trong bất kỳ `package.json` nào đã audit** (`admin-web`,
  `web`, `admin-api` chỉ có `@cms/block-registry`, `@cms/shared-types`, `@cms/tsconfig` là dependency
  workspace thật). Coi các package còn lại là **roadmap Phase 2**, không phải đã scaffold sẵn — nếu
  task yêu cầu "sửa `packages/ui`", việc đầu tiên là kiểm tra `ls packages/` chứ không giả định file tồn tại.
- **Tailwind đang là v3.4.17 (`tailwind.config.js` dạng CommonJS/ESM cũ), không phải v4 CSS-first**
  dù mục "Best practice" của tài liệu kiến trúc ghi Tailwind v4. Viết class/theme theo cú pháp v3
  (`theme.extend` trong file JS), không dùng `@theme` directive của v4.
- **`admin-web` chưa có `packages/ui`** — token màu Material You (`primary`, `on-surface`,
  `surface-container`...) định nghĩa trực tiếp trong `apps/admin-web/tailwind.config.js`. `apps/web`
  hiện có `tailwind.config.js` gần như rỗng (`theme.extend: {}`) — nghĩa là canvas preview trong
  Page Editor (xem `packages/block-registry/AGENTS.md`, "tái sử dụng Renderer để preview giống thật")
  **hiện chưa cùng theme** với `web`. Nếu task liên quan tới preview không khớp giao diện thật, đây là
  nguyên nhân gốc, không phải bug ở component.
- **`Role.permissions` là `Json` (mảng string) trong Prisma, không có model `Permission` riêng** —
  README mục "Database schema" vẽ sơ đồ có `RolePermissions` như bảng nối là mô tả logic, không phải
  bảng thật. Query permission luôn qua `role.permissions` (mảng), không `role.rolePermissions.permission`.

## 5. Quy ước code

- REST resource: danh từ số nhiều (`/pages`, `/blocks`, `/media`).
- `block.type`: kebab-case (`hero`, `rich-text`, `product-list`) — phải khớp *chính xác* key dùng
  trong `registry.ts` và giá trị lưu ở cột `blocks.type` trong DB.
- Response envelope bắt buộc theo `common/interceptors/response.interceptor.ts`:
  `{ success: true, data, meta? }` hoặc `{ success: false, error: { code, message, details } }`.
  Không trả raw object/array trực tiếp từ controller.
- Repository pattern trên Prisma: mọi query đi qua `*.repository.ts` (`PagesRepository`,
  `BlocksRepository`...), không gọi `this.prisma.page.findMany` thẳng trong `*.service.ts`.
- State ở `admin-web`: dữ liệu server → TanStack Query. State UI thuần (block đang chọn, panel mở,
  cờ dirty) → Zustand (`editor.store.ts`). Không đẩy dữ liệu server vào Zustand store.

## 6. Trước khi coi một task là "xong"

```bash
pnpm --filter <workspace-vừa-sửa> lint
pnpm --filter <workspace-vừa-sửa> build
pnpm --filter admin-api test          # nếu đụng tới admin-api
```

Nếu sửa `packages/block-registry`: chạy build/lint ở **cả ba app** (`admin-api`, `@cms/admin-web`,
`@cms/web`), vì cả ba cùng import package này và có thể type-error ở nơi không ngờ tới.

Nếu sửa `prisma/schema.prisma`: bắt buộc `pnpm db:generate` rồi mới build/chạy `admin-api`, nếu không
Prisma Client cũ (đã generate trước đó) sẽ không khớp schema mới → lỗi type mismatch khó hiểu.