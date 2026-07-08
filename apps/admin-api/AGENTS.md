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

## 2. Media Usage Check

- `MediaService.findUsages()` recursively scans **every block in the DB** looking for `mediaId`
  inside the JSONB `data`, regardless of `pageVersion.status` (DRAFT/PUBLISHED/ARCHIVED).
- When adding a new media-storing field, always name the key `mediaId` so the automatic scan
  picks it up.
- **Known perf gap**: this function does `findMany` with no `where` clause, then filters
  recursively in JS — gets slower as block count grows. A future optimization should switch to a
  Postgres JSONB query (`data @> ...`) to filter at the DB level.

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
  `public-pages.controller.ts` (public API for `apps/web`). For any new route, always ask which
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

## 9. CORS for multi-subdomain deployment

When `admin-web`/`admin-api` are on different subdomains: declare all domains in `CORS_ORIGIN`
(`.env`, comma-separated, no spaces). `app.enableCors()` in `main.ts` must explicitly declare
`methods` (including `PATCH`, `DELETE`) — by default, preflight for these methods can be blocked
even with a correct origin. Details: `DEPLOYMENT.md` at root.