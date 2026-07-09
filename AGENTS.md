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
| Google OAuth callback NEVER uses `@UseGuards(AuthGuard('google'))` / Passport guards | Passport is Express-oriented; guard-based flow crashes/misbehaves under Fastify. Use manual code exchange in `AuthService.exchangeGoogleCode()` instead (see Section 8) |

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

### Auth — Google OAuth (existing users only, no auto-create)
- **Never** use `@nestjs/passport`'s `AuthGuard('google')` on the callback route — Passport's
  guard/session model is Express-oriented and breaks (crash loop / hung requests) under Fastify.
  `google.strategy.ts` and `google-auth.guard.ts` are kept in the repo as reference but are
  **not wired into any route** — do not re-add `@UseGuards(...)` on `/auth/google/callback`.
- Actual flow lives in `AuthController` + `AuthService`:
  1. `GET /auth/google` — manually builds the Google consent URL and 302-redirects (no Passport).
  2. `GET /auth/google/callback` — reads `?code=` from the query, calls
     `AuthService.exchangeGoogleCode(code)`, which does the token exchange + userinfo fetch via
     plain `axios` calls, then issues app JWTs via the existing `loginWithGoogle()`.
- **Existing users only**: `UsersService.findUserByGoogleProfile()` looks up by `googleId` first,
  then by normalized email to auto-link, but **never creates** a new `User` row. No match → the
  controller redirects to `${FRONTEND_URL}/login?error=no_account`.
- `User.googleId` / `displayName` / `avatarUrl` are nullable columns (existing password-based users
  have them `null` until their first Google login links the account).
- Frontend: `GoogleCallbackPage.tsx` MUST call `AuthContext`'s `loginWithToken(token)` (not just
  store the token + call `authApi.me()` separately) — otherwise `AuthContext.user` stays `null`,
  `ProtectedRoute` sees `isAuthenticated: false`, and the user gets bounced back to `/login` right
  after a successful Google login (only fixed itself on a manual page reload).

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

**"P3018 — migration failed to apply / column already exists"**
- Means the column was added to the DB previously (manually, or a migration partially ran) but
  `_prisma_migrations` doesn't reflect it as applied.
- Fix: `pnpm --filter admin-api exec prisma migrate resolve --applied <migration_name>` if the
  columns genuinely already match the migration, **or** `--rolled-back` + delete the row from
  `_prisma_migrations` (`docker exec <pg-container> psql -U cms_user -d cms_db -c "DELETE FROM
  \"_prisma_migrations\" WHERE migration_name = '<name>';"`) if you're going to re-run it clean.
- Root cause is almost always **migration history drift between local and server** — see next
  entry. Always run `prisma migrate status` on both sides after any manual fix.

**"Local and server have different migrations found in prisma/migrations"**
- Means a migration was created directly on one side (e.g. server, during an emergency fix) and
  never committed to git, or a migration was deleted on one side only.
- **Never create migrations directly on the server.** Always: create + test on local via
  `prisma migrate dev`, commit the `migrations/` folder to git, `git push`, then on server just
  `git pull` + `prisma migrate deploy`. If a migration was created on server out of necessity
  (as happened once for `add_google_oauth_fields`), commit it back to git immediately and pull it
  into local, then reconcile local's `_prisma_migrations` table with `migrate resolve --applied`
  (columns already exist locally too if you'd been testing the same feature there).

**"MODULE_NOT_FOUND: Cannot find module '.prisma/client/default'" after `git pull`**
- Prisma Client wasn't (re)generated for the current `schema.prisma` after pulling new migrations
  or a fresh `pnpm install`. Fix: `pnpm --filter admin-api exec prisma generate` then
  `pnpm --filter admin-api build`, then `pm2 restart cms-admin-api`. If it still fails, run a full
  `pnpm install` first (a `pnpm-lock.yaml` change can leave `node_modules` half-updated).

---

## For Detailed Rationale, See:

- `ARCHITECTURE-DESIGN.md` — why invariants exist
- `apps/admin-api/AGENTS.md` — NestJS/Prisma specifics
- `apps/admin-web/AGENTS.md` — React/Vite specifics
- `apps/web/AGENTS.md` — Next.js specifics
- `packages/block-registry/AGENTS.md` — block system walkthrough