# AGENTS.md — apps/admin-api

> Read `/AGENTS.md` (root) first. This file only covers conventions specific to `admin-api`.

## 1. Mandatory rules (read before touching code)

| Rule | Detail | Violation impact |
|---|---|---|
| No repository pattern | Every Prisma query calls `this.prisma.<model>.xxx()` directly inside `*.service.ts` | Differs from original architecture docs but is the actual reality — keep this pattern for new modules (root AGENTS.md Section 1.1) |
| Response envelope mandatory | `{ success: true, data, meta? }` or `{ success: false, error: { code, message, details } }` (`response.interceptor.ts`) | Never return a raw object/array from a controller |
| Validate `blocks.data` with Zod only | `BlocksService.validateBlockData()` uses the schema from `@cms/block-registry` | Do not add parallel class-validator decorators for this JSONB field — two validation sources will drift apart |
| Never render HTML | JSON responses only | A task to "make a block look nicer" does not belong in this app |
| Publish = flip the pointer | `pages.publishedVersionId` | Never UPDATE the currently PUBLISHED version directly |
| No Passport Guards for Google OAuth callback | `GET /auth/google` and `GET /auth/google/callback` are handled manually in `AuthController`/`AuthService` (redirect + `axios` code exchange) — **not** `@UseGuards(AuthGuard('google'))` | Passport's guard integration is Express-oriented and breaks under this app's Fastify adapter (hangs / 500s). See Section 10. |
| Mọi hàm trả `PageVersion.blocks` ra API phải enrich qua `BlocksService.enrichBlockData()` | `PageVersionsService.enrichVersionBlocks()` | Quên bước này khiến `hero.image.url` rỗng dù đã chọn ảnh — chỉ có `mediaId` |
| Tối đa 1 DRAFT/page — enforce ở DB, không chỉ ở code | Partial unique index `page_versions_one_draft_per_page` | Tạo DRAFT phải qua `getOrCreateDraft()` (có retry P2002), không viết `create` DRAFT tay ở chỗ khác |

## 2. Media Usage Check

- `MediaService.findUsages()` recursively scans **every block in the DB** looking for `mediaId`
  inside the JSONB `data`, regardless of `pageVersion.status` (DRAFT/PUBLISHED/ARCHIVED).
- When adding a new media-storing field, always name the key `mediaId` so the automatic scan
  picks it up.
- **Known perf gap**: this function does `findMany` with no `where` clause, then filters
  recursively in JS — gets slower as block count grows. A future optimization should switch to a
  Postgres JSONB query (`data @> ...`) to filter at the DB level.

## 2.1 Page Draft Creation — Race Condition Fix

- `PageVersionsService.getOrCreateDraft(pageId, userId)` là **entry point duy nhất** để lấy/tạo
  DRAFT cho Live Edit Mode (`POST /pages/:id/draft`). Trước đây có 2 lỗi đã fix:
  1. **Thiếu `orderBy`** khi tìm DRAFT hiện có → nếu do race condition có >1 DRAFT tồn tại, có
     thể trả nhầm bản cũ/stale. Đã thêm `orderBy: { createdAt: 'desc' }`.
  2. **Không chống race condition**: nếu 2 request gọi gần như đồng thời (ví dụ React Strict
     Mode double-invoke effect ở `apps/web`), cả 2 đều thấy "chưa có DRAFT" rồi cùng tạo mới →
     2 DRAFT cho cùng 1 page.
- **Fix ở tầng DB** (đáng tin cậy nhất, migration `..._one_draft_per_page`):
```sql
  CREATE UNIQUE INDEX "page_versions_one_draft_per_page"
  ON "page_versions" ("pageId")
  WHERE status = 'DRAFT';
```
  `getOrCreateDraft()` bọc `cloneVersionIntoNewDraft()` bằng try/catch, bắt
  `Prisma.PrismaClientKnownRequestError` code `P2002` — khi thua race, refetch lại bản DRAFT vừa
  được request khác tạo, thay vì để lỗi 500 văng ra ngoài.
- ⚠️ Nếu migration báo lỗi `P3018`/`23505` khi apply lần đầu, nghĩa là DB **đã có sẵn** page với
  >1 DRAFT (dữ liệu cũ trước khi có fix). Cần dọn dữ liệu (giữ lại DRAFT mới nhất mỗi page) trước
  khi áp index — xem script dọn dẹp trong lịch sử PR/agent-session liên quan, không tự ý xóa DRAFT
  hàng loạt mà không kiểm tra thủ công trước (2 DRAFT trùng có thể có nội dung khác nhau, không
  phải lúc nào bản mới nhất cũng là bản "đúng").

## 2.2 Template Autofill — fixed rule, not client-configurable

`autoFillMap` on `TemplatePlaceholder` is **no longer accepted from the client**
(`setPlaceholdersSchema` has no `autoFillMap` field). `TemplatesService.setPlaceholders()`
derives it server-side with a single fixed rule: placeholder `type === 'hero'` →
`{ title: 'page.title' }`; every other type → `undefined` (no autofill).

**Why removed**: the previous design let admin-web offer a dropdown mapping ANY block field
(including array/object fields like `faq.items: FaqItem[]`) to a string source
(`page.title`/`page.slug`). This crashed `PagesService.create()` with an unhandled `ZodError`
(500) whenever `items` got mapped to a string — `resolveAutoFill()` had no field-type check.
Rather than keep validating an open-ended client input, autofill was simplified to the one rule
actually needed in product. If a future task asks for other autofill mappings, that's a deliberate
feature re-add — re-introduce `resolveAutoFill()`'s type-guard (`typeof existing !== 'string' →
skip`, see `template-autofill.util.ts`) AND client-side validation together, don't repeat the
unguarded-client-input mistake.

## 3. Page Version Endpoints

- `POST /page-versions/:id/revert` (Set as Draft): deletes the current DRAFT if one exists
  (cascades to its blocks), clones the specified ARCHIVED version into a new DRAFT.
- `PATCH /page-versions/:id/seo-meta`: updates `seoMeta.title`/`description` on DRAFT/ARCHIVED
  versions. **Direct edits to PUBLISHED are blocked.**

## 4. `Page.title` — do NOT confuse with `PageVersion.seoMeta.title`

- `Page.title` column (migration: `ALTER TABLE pages ADD COLUMN title TEXT NOT NULL DEFAULT ''`)
  — fully separate from `seoMeta.title`.
- **Not versioned** — unlike `seoMeta` (lives on `PageVersion`, goes through DRAFT/publish).
  Updating `title` applies immediately, and does **not** auto-create/fork a DRAFT version.
- `POST /pages` (`createPageSchema`): `title` optional, defaults to `''`, saved directly to
  `Page.title` (NOT merged into `seoMeta` — old bug, already fixed).
- `PATCH /pages/:id` (`updatePageSchema`): `slug`/`title` are independent optionals — only patches
  whichever field is actually present in the body, same `page:update` permission.
- `public-pages.controller.ts` (`listPublished()`, `getBySlug()`): returns `title` with fallback
  order **`page.title` → `seoMeta.title` → `page.slug`**. This second-tier fallback exists so
  pages created before the migration don't break — **do not remove it** unless `title` has been
  backfilled for all pre-existing pages.
- ⚠️ **Consequence to know**: for a PUBLISHED page, if an admin edits `title` and only presses
  Save Draft (no Publish), the new title **goes live on the public site immediately** (unlike
  `seoMeta`, which only applies after Publish). This is an intentional tradeoff. If a future task
  requires `title` to be versioned like `seoMeta`, that is an **architecture change** (move
  `title` to `PageVersion`), not a bugfix.

## 4.1 `GET /pages` — filter by `templateId`

- `listPagesSchema` has an optional `templateId` (uuid). `PagesService.findAll()` always applies
  `where.templateId = params.templateId ?? null` — **never** omits the field from `where`. Using
  `undefined` instead of `null` would make Prisma skip the filter entirely and return pages across
  all templates mixed together — this was a real bug (Sidebar linked to
  `/content-management?templateId=X` but the endpoint ignored the param, so every template's pages
  and static pages rendered in the same table, all clickable regardless of the active tab).
- Consequence: there is no single "list every page regardless of template" mode via this endpoint.
  If a future task needs that, it's a new query param (e.g. `templateId=all`), not a change to the
  default behavior — default must stay `null` (static pages only) to match the Sidebar's "Pages"
  item.

## 5. RBAC — Roles & Permissions (`modules/roles/`)

**Prisma model:** `Role` — `Permission` — `RolePermission` (join table, `@@id([roleId, permissionId])`).
- ⚠️ The relation field on `Role` is named **`rolePermissions`**, NOT `permissions` —
  `shared-types.Role.permissions` (the DTO returned to the frontend) uses a different name than
  the actual Prisma field; don't confuse the two.
- `Permission` = `{ resource, action }`, unique on `[resource, action]`.
  - `PermissionResource`: `'page' | 'media' | 'user' | 'role'` (singular form).
  - `PermissionAction`: `'create' | 'read' | 'update' | 'delete' | 'publish'`.
- `RolesGuard` + `@RequirePermissions('resource:action')`: checks against
  `JwtPayload.permissions[]`, already embedded at login — **no DB query per request**.
- **MANDATORY RULE**: every route in every controller must have `@RequirePermissions`, including
  `GET` routes. There are no "public" routes among the audited modules (`blocks`, `media`,
  `pages`, `page-versions`, `users`, `roles`) — the single exception is
  `public-pages.controller.ts` (public API for `apps/web`) **and** the two Google OAuth routes
  (`GET /auth/google`, `GET /auth/google/callback`), which must remain unauthenticated by nature
  (that's the entire point of a login endpoint). For any new route, always ask which
  `resource:action` it belongs to before merging.

### 5.1 Latest audit (routes patched for missing permissions)
| Route | Permission | Note |
|---|---|---|
| `GET /blocks` | `page:read` | previously missing |
| `GET /pages`, `GET /pages/:idOrSlug` | `page:read` | previously missing |
| `GET /page-versions` (findDraft), `GET /page-versions/archived` | `page:read` | previously missing |
| `PATCH /media/:id/rename` | `media:create` (temporary) | ⚠️ workaround, see 5.2 |

### 5.2 Known gap: `media:update` does not exist yet
`PermissionResource` for `media` currently only has `create | read | delete` — no `update`.
Rename temporarily uses `media:create`, meaning a user with `media:create` but without
`media:read`/`delete` can still rename files — this does not match the original RBAC intent.
To split the permission properly:
1. Add `{ resource: 'media', action: 'update' }` to `ALL_PERMISSIONS` in `prisma/seed.ts`.
2. Re-run `pnpm --filter admin-api prisma:seed`.
3. Change the decorator on `MediaController.rename` to `@RequirePermissions('media:update')`.

Do not do this outside the scope of an assigned task.

### 5.3 Current seed (`prisma/seed.ts`, `ALL_PERMISSIONS`)
16 permissions total — no `media:update`; a single `page:read` permission is shared across all
read routes for `pages`/`blocks`/`page-versions` (all part of the "view page content" domain).

### 5.4 `roles.controller.ts` endpoints (prefix `/api/v1/roles`)
| Method + path | Permission | Note |
|---|---|---|
| `GET /roles` | `role:read` | lists roles with permissions + userCount |
| `GET /roles/permissions/list` | `role:read` | lists all assignable permissions — NOT `/roles/permissions`, to avoid confusion with the existing `GET /users/roles/list` |
| `POST /roles` | `role:create` | |
| `PATCH /roles/:id` | `role:update` | renames only |
| `PATCH /roles/:id/permissions` | `role:update` | overwrites the role's entire permission set (deletes all old `RolePermission` rows and recreates them in one transaction) |
| `DELETE /roles/:id` | `role:delete` | blocked if any user is still assigned this role (`ConflictException`) |

Seeding + default assignment for `admin | editor | viewer`: `prisma/seed.ts` (`ALL_PERMISSIONS`,
`ROLE_PERMISSIONS`) — run via `pnpm --filter admin-api prisma:seed`.

## 6. Media Optimization (generates 3 image variants on upload)

Library: **`sharp`** (native libvips binding, free, no API key needed) —
`modules/media/image-optimizer.util.ts`. Applies only to raster images (SVG skips this pipeline
entirely, since it's vector).

Every raster upload produces **3 variants**, all converted to **WebP** with **metadata stripped**
(default `sharp` behavior when `.withMetadata()` is not called):

| Variant | maxDimension | targetBytes | Used for |
|---|---|---|---|
| `original` | 2560 | not enforced | Overwrites the originally uploaded file — **the raw upload is not kept** |
| `detail` | 1600 | ≤300KB | Intended for the Page Editor canvas preview — **NOT wired to any frontend yet** (the field exists in the DB) |
| `thumb` | 400 | ≤300KB | Media Library grid |

- `targetBytes` enforcement algorithm in `optimizeImage()`: reduces `quality` first (step 12,
  floor 40); once quality has no more room, reduces `maxDimension` (factor 0.85); capped at
  `MAX_ITERATIONS = 8` to avoid infinite loops — prioritizes keeping resolution over over-reducing
  quality.
- `rotateDeg`/`crop`: parameters already exist in `optimizeImage()` but **no endpoint/UI calls
  them yet** — currently just a utility function, not a finished user-facing feature.
- Prisma `Media` model: 4 new nullable fields (nullable since SVGs and pre-existing records won't
  have them) — `detailKey`, `detailUrl`, `thumbKey`, `thumbUrl`. (`width`/`height` existed from the
  start, unrelated to this addition.)
- `rename()`/`delete()` are kept in sync across all 3 variants — no orphaned variant files left
  behind.
- Install: `pnpm --filter admin-api add sharp`.
- `BlocksService.enrichBlockData(type, data)` (đang `public`, không phải `private`) được tái sử
  dụng bởi `PageVersionsService` (`enrichVersionBlocks()`) để resolve `hero.image.url` cho mọi
  endpoint trả về `PageVersion.blocks`, không chỉ `GET /blocks`. Nếu thêm endpoint mới trả blocks
  ra ngoài, luôn nhớ enrich — quên bước này là nguyên nhân bug "ảnh biến mất khi vào Edit Mode".

## 7. Common commands

```bash
pnpm --filter admin-api dev              # :3001
pnpm --filter admin-api build
pnpm --filter admin-api test
pnpm --filter admin-api prisma:generate  # required after editing prisma/schema.prisma
pnpm --filter admin-api prisma:migrate
pnpm --filter admin-api prisma:seed      # ts-node runs the .ts file directly, no build step
```

⚠️ **Root script name mismatch**: root `package.json` has `db:migrate`/`db:generate` calling
`pnpm --filter admin-api prisma migrate dev` / `prisma generate` — this is WRONG, because
`admin-api/package.json` names its scripts `prisma:migrate`/`prisma:generate` (with a colon). If
you hit "None of the selected packages has a 'prisma' script" when running `pnpm db:migrate` from
root, this is the cause. Always call `pnpm --filter admin-api prisma:migrate` directly to be safe.

## 8. Known gaps

- `package.json` has no `"prisma": { "seed": "..." }` field — only needed if using
  `prisma migrate reset`. If you always call `pnpm prisma:seed` directly, this field is not
  required (differs from the original description in root AGENTS.md Section 4) — only add it if
  `migrate reset` is genuinely needed.
- The global `/api/v1` prefix applies to every controller — Swagger/Postman testing always needs
  this prefix.
- `media:update` does not exist yet — see Section 5.2.
- `detailUrl` is not wired into any UI/consumer yet — not a bug if you encounter a task related to
  medium-size image previews.
- `Page.title` has not been backfilled for pages created before the migration — old pages have
  `title = ''`, and the UI/API fall back to `slug`/`seoMeta.title` for display, but the actual
  `title` column stays empty until an admin edits it manually. Not a bug, just a missing backfill
  script.
- `GoogleStrategy` (`strategies/google.strategy.ts`) and `GoogleAuthGuard`
  (`guards/google-auth.guard.ts`) exist in the codebase and are registered as `providers` in
  `auth.module.ts`, but are **not used by any route**. Kept as reference / in case a future Fastify
  version or Passport update fixes the incompatibility. Do not wire them back into
  `/auth/google/callback` without re-verifying the Fastify issue is actually resolved — see
  Section 10.

## Known gap: Rename media không tự sync `url` đã lưu cứng trong `Block.data`

`MediaService.rename()` chỉ cập nhật `Media.url`/`key` trong bảng `media` — KHÔNG quét/update
ngược các `Block.data` (JSONB) đang tham chiếu `mediaId` đó. Vì `hero.image` lưu cả `{ mediaId, url }`
(không chỉ `mediaId`) tại thời điểm admin chọn ảnh trong `MediaPicker`, sau khi rename, `url` cũ
trong `Block.data` bị stale — hiển thị lỗi 404 trên `apps/web` dù `Media.url` trong DB đã đúng.

**Workaround hiện tại**: mở lại page bị ảnh hưởng trong admin-web → chọn lại ảnh trong
BlockDataForm → Save Draft → Publish, để `url` được ghi đè bằng giá trị mới.

**Fix triệt để (chưa làm — flag cho task sau)**: sau khi `rename()`, chạy `findUsages(mediaId)`
(logic đã có sẵn, dùng bởi delete-usage-check) để tìm mọi block đang tham chiếu, rồi cập nhật
`url` trong `Block.data` của các block đó ngay trong cùng transaction. Cần cẩn thận: chỉ patch
`url`, không đổi `mediaId`, và phải validate lại qua Zod schema của block đó trước khi ghi (giống
cách `stripMediaReference()` làm khi delete).

## 9. CORS for multi-subdomain deployment

When `admin-web`/`admin-api` are on different subdomains: declare all domains in `CORS_ORIGIN`
(`.env`, comma-separated, no spaces). `app.enableCors()` in `main.ts` must explicitly declare
`methods` (including `PATCH`, `DELETE`) — by default, preflight for these methods can be blocked
even with a correct origin. Details: `DEPLOYMENT.md` at root.

## 10. Google OAuth Login (existing users only)

**Why no Passport Guard:** this app runs on the **Fastify** adapter (not Express). The standard
NestJS tutorial pattern — `PassportStrategy` + `@UseGuards(AuthGuard('google'))` on the callback
route — hung / crashed under Fastify (Passport's guard integration assumes Express-style
request/response). Full rationale: root `ARCHITECTURE-DESIGN.md`, Section 8.

**Actual flow (`modules/auth/`):**

- `GET /auth/google` (`AuthController.googleLogin`) — reads `GOOGLE_CLIENT_ID` /
  `GOOGLE_CALLBACK_URL` from env, manually builds the Google consent-screen URL, and does
  `reply.code(302).redirect(authUrl)`. No Passport strategy invoked.
- `GET /auth/google/callback` (`AuthController.googleCallback`) — reads `code` off
  `req.query`, calls `AuthService.exchangeGoogleCode(code)`:
  1. `POST https://oauth2.googleapis.com/token` — exchanges the code for a Google access token
     (plain `axios`, not `passport-google-oauth20`'s internal client).
  2. `GET https://www.googleapis.com/oauth2/v2/userinfo` — fetches `id`, `email`, `name`,
     `picture`, `verified_email` using the Google access token.
  3. Rejects if `verified_email` is falsy, or `email`/`id` missing.
  4. Calls `UsersService.findUserByGoogleProfile({ googleId, email, displayName, avatarUrl })`
     — **never creates** a new `User` row (see below).
  5. On match, reuses `AuthService.loginWithGoogle(user)` to sign app JWTs the same way
     `login()` does for password auth (same `JwtPayload` shape, same refresh-token-hash rotation).
- Controller owns every redirect branch — no code, invalid account, or upstream error all
  redirect to `${FRONTEND_URL}/login?error=...` instead of throwing raw JSON, since a browser
  navigation (not an XHR) hits this route.

**Existing users only — no auto-provisioning:**
`UsersService.findUserByGoogleProfile()`:
1. Fast path: look up by `googleId` (already linked from a previous Google login).
2. Slow path: look up by normalized (lowercased/trimmed) `email` — if found, **link** the account
   by writing `googleId`/`displayName`/`avatarUrl` onto the existing row.
3. If neither matches → return `null`. The controller then redirects to
   `/login?error=no_account`. **No new `User` row is ever created from this flow** — accounts are
   still provisioned only via `POST /users` (admin/editor UI). If a future task asks for
   self-service Google sign-up, that's a deliberate product/architecture change, not a bugfix —
   flag it.

**Required env vars** (`.env`):
```dotenv
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://api.khucnhan.io.vn/api/v1/auth/google/callback
FRONTEND_URL=https://admin.khucnhan.io.vn
```
`GOOGLE_CALLBACK_URL` must exactly match an **Authorized redirect URI** registered in Google Cloud
Console (including the `/api/v1` prefix — easy to forget). Local dev needs its own separate entry
(e.g. `http://localhost:3001/api/v1/auth/google/callback`) added alongside the production one, not
replacing it.

**New Prisma columns** (`User` model): `googleId String? @unique`, `displayName String?`,
`avatarUrl String?` — all nullable since password-only users won't have them until their first
Google login links the account. Migration: `add_google_oauth_fields`.

**Dependencies:** `passport-google-oauth20` + `@types/passport-google-oauth20` are still installed
(used only by the inert `GoogleStrategy`, kept as reference — see Section 8 gap note); the actual
runtime flow's only new dependency is `axios`.

## 11. Test — chủ đích tối giản (không phải thiếu sót)

Chỉ giữ 3 test bảo vệ đúng những invariant có hậu quả nghiêm trọng nhất nếu vi phạm:
`page-versions.service.spec.ts` (publish không mutate published version — 1.5),
`auth.service.spec.ts` (Google OAuth existing-users-only — Section 8),
`test/rbac.e2e-spec.ts` (mọi route đều cần permission — Section 5). Đây là quyết định
có chủ đích để giảm chi phí maintain ở quy mô team hiện tại — không tự ý mở rộng thêm
test cho các module khác (users, roles, media CRUD cơ bản) trừ khi được yêu cầu rõ ràng.