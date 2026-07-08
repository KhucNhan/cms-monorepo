# AGENTS.md — Agent Runbook

**Read before modifying anything.** Most bugs = violating Section 1 invariants, not logic errors.

## 0. Repo Overview (30 sec)

3 apps + 1 core package:

| App | Path | Stack | Port |
|---|---|---|---|
| Admin API | `apps/admin-api` | NestJS 11 + Fastify + Prisma 6 + Zod | 3001 |
| Admin Web | `apps/admin-web` | React 19 + Vite 6 + Tailwind 3 | 5173 |
| Public Web | `apps/web` | Next.js 15 App Router | 3000 |

**Critical:** `packages/block-registry` = single source of truth for all blocks. Always START and END there if touching block fields.

---

## 1. NON-NEGOTIABLE Invariants

🔴 **Breaking these = silent bugs across 3 apps**

| Rule | Impact |
|------|--------|
| NO React/NestJS imports in `packages/block-registry/src/blocks/*/schema.ts` | Breaks Node.js imports |
| NO `switch(block.type)` except in `registry.ts` — always use `getBlockDefinition(type)` | Type hazard, unknown blocks fail silently |
| NestJS never renders HTML, always JSON via `response.interceptor.ts` envelope | Schema mismatch between apps |
| `blocks.data` validated ONLY via Zod at `BlocksService.validateBlockData()` — NO class-validator decorators | Dual validation sources drift |
| Publish = update `pages.publishedVersionId` only, never mutate published version in place | Data corruption |
| `apps/web` NEVER queries Postgres, only via Admin API `lib/cms-client.ts` | Architecture violation |
| All routes use `/api/v1` prefix (auto-applied in `main.ts`) | Docs/logs mismatch |

**Known deviation:** Services inject `PrismaService` directly (no `*.repository.ts` pattern yet). Follow existing code, don't introduce repositories.

---

## 2. Essential Commands

```bash
# Run
pnpm dev                                 # all 3
pnpm --filter admin-api dev              # API only
pnpm --filter @cms/admin-web dev         # React UI only
pnpm --filter @cms/web dev               # Next.js only

# Build
pnpm --filter @cms/shared-types build    # MUST RUN FIRST if modified
pnpm build                               # all

# Prisma (admin-api only)
pnpm --filter admin-api exec prisma generate
pnpm --filter admin-api prisma:migrate
pnpm --filter admin-api prisma:seed

# Check before push
pnpm --filter <modified> lint
pnpm --filter <modified> build
pnpm test
```

**⚠️ If modified `packages/block-registry`:** run build/lint for **all 3 apps**.  
**⚠️ If modified `prisma/schema.prisma`:** run `prisma generate` before build.  
**⚠️ If modified `packages/shared-types`:** run build before `admin-api` sees changes (it imports from `dist/`).

---

## 3. Block Registry Checklist

See `packages/block-registry/AGENTS.md` for full 5-step checklist. TL;DR:

1. Create `src/blocks/<block-name>/schema.ts` with Zod schema (NO React/NestJS imports)
2. Create `src/blocks/<block-name>/index.ts` exporting Editor + Renderer
3. Register in `src/registry.ts`
4. Export from `src/index.ts`
5. Run `pnpm build`

---

## 4. Quick Reference: Known Gaps & Quirks

| Issue | Status | Workaround |
|-------|--------|-----------|
| `admin-api/package.json` missing `"prisma": { "seed": "ts-node prisma/seed.ts" }` | Known | Add manually if needed |
| `packages/form-engine`, `packages/ui` mentioned in docs but don't exist | Roadmap | Treat as Phase 2 |
| Tailwind v3.4.17 (not v4 CSS-first) | Current | Use `tailwind.config.js` with `theme.extend` |
| `admin-web` has no shared `packages/ui` | Current | Material You tokens in `admin-web/tailwind.config.js` |
| `Role.permissions` = `Json[]`, no `Permission` model | Schema | Query via `role.permissions`, not `role.rolePermissions` |
| `Page.title` (unversioned, display name) ≠ `PageVersion.seoMeta.title` (versioned, public `<title>`) | Schema | **Do not confuse.** See `ARCHITECTURE-DESIGN.md` Section 6 |

---

## 5. Coding Standards

- REST: plural nouns (`/pages`, `/blocks`, `/media`)
- `block.type`: kebab-case, must match `registry.ts` key exactly
- API response: always use envelope from `response.interceptor.ts`
  ```ts
  { success: true, data, meta? }
  { success: false, error: { code, message, details } }
  ```
- State in `admin-web`:
  - Server ↔ TanStack Query
  - UI state (selected, open, dirty) ↔ Zustand stores
  - Never copy server state to Zustand

---

## 6. Gotchas by Area

### Pages & Versions
- `publishedVersionId` = pointer to published version, change it to publish (don't mutate version in place)
- `Page.title` is unversioned (internal name), `PageVersion.seoMeta.title` is versioned (public SEO title)
- DRAFT version can be deleted; deleting DRAFT clears all blocks via cascade

### Media
- Recursive usage check: deleting media scans ALL blocks in ALL versions (DRAFT/PUBLISHED/ARCHIVED) for `mediaId` references
- Inline rename supported; no modal for file details

### Blocks
- Always validate data via `BlocksService.validateBlockData()` using block-registry schema before DB write
- Never hardcode block type checks; always call `getBlockDefinition(type)`

### Admin Web + API (cross-subdomain)
- Both live on separate subdomains (e.g., `admin.khucnhan.io.vn` + `api.khucnhan.io.vn`)
- `admin-api` CORS must explicitly include methods: `['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS']`
- Vite `server.proxy` ONLY works in `dev` mode, not `preview` — use `VITE_API_URL` env var for prod

---

## 7. Troubleshooting Checklist

**"Type error in admin-api after modifying block-registry"**
- Run `pnpm --filter @cms/shared-types build` (if touched shared-types)
- Run `pnpm build` for all 3 apps

**"Prisma client out of sync"**
- Run `pnpm --filter admin-api exec prisma generate`

**"CORS error from admin-web to admin-api"**
- Check `CORS_ORIGIN` env var in `admin-api/.env`
- Verify `methods` array includes `PATCH`/`DELETE` in `main.ts`

**"Block not rendering in editor"**
- Verify `block.type` matches `registry.ts` key (kebab-case)
- Verify schema exported correctly, no React imports

**"Media not deleting (says in use)"**
- Recursive check found it in some version — check all DRAFT/PUBLISHED/ARCHIVED pages

---

## For Detailed Rationale, See:

- `ARCHITECTURE-DESIGN.md` — why invariants exist
- `apps/admin-api/AGENTS.md` — NestJS/Prisma specifics
- `apps/admin-web/AGENTS.md` — React/Vite specifics
- `apps/web/AGENTS.md` — Next.js specifics
- `packages/block-registry/AGENTS.md` — block system walkthrough