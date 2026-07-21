# CMS Monorepo

> NestJS + PostgreSQL · React + Vite · Next.js App Router · pnpm workspaces · Turborepo

---

## Architecture overview

The system has three independently-running apps that share logic through common packages:

```
cms-monorepo/
├── apps/
│   ├── admin-api/       # NestJS — Content API + Auth
│   ├── admin-web/       # React + Vite — admin UI
│   └── web/             # Next.js App Router — public site
└── packages/
    ├── block-registry/  # ⭐ single source of truth for every block
    ├── shared-types/    # Page, User, Media, API envelope...
    └── tsconfig/        # shared base tsconfig
```

```mermaid
flowchart LR
    subgraph Shared["packages/"]
        BR[block-registry<br/>schema · editor · renderer]
        ST[shared-types]
    end

    AdminWeb["admin-web<br/>React + Vite :5173"] -->|schema + editor| BR
    AdminAPI["admin-api<br/>NestJS :3001"]       -->|schema only| BR
    Web["web<br/>Next.js :3000"]                 -->|schema + renderer| BR

    AdminWeb -->|REST /api/v1| AdminAPI
    AdminAPI -->|Prisma| PG[(PostgreSQL)]
    Web       -->|GET /pages/:slug| AdminAPI
    AdminAPI  -->|revalidateTag webhook| Web
```

Core principle: **`block-registry` is the single source of truth**. Each block's `schema.ts` is
pure TypeScript/Zod — no React dependency — so all three apps can import it. Adding a new block
means creating one folder, not scattering edits across the codebase.

> **For contributors and coding agents:** development conventions, invariants, and known gotchas
> live in `AGENTS.md` files, not here — start with the root [`AGENTS.md`](./AGENTS.md), then the
> per-app file for whichever app you're touching:
> [`apps/admin-api/AGENTS.md`](./apps/admin-api/AGENTS.md),
> [`apps/admin-web/AGENTS.md`](./apps/admin-web/AGENTS.md),
> [`apps/web/AGENTS.md`](./apps/web/AGENTS.md),
> [`packages/block-registry/AGENTS.md`](./packages/block-registry/AGENTS.md). Read those before
> making non-trivial changes — most bugs come from violating an invariant documented there, not
> from logic errors.

---

## Requirements

| Tool       | Version  |
|------------|----------|
| Node.js    | ≥ 20     |
| pnpm       | ≥ 9      |
| PostgreSQL | ≥ 15     |

---

## Step 1 — Install PostgreSQL

Pick **one** of the three options:

### Option A — Neon (cloud, nothing to install — recommended)

1. Go to https://neon.tech → sign up for free
2. Create a project → copy the **connection string**:
   ```
   postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. Paste it into `DATABASE_URL` in your `.env` file

### Option B — Local PostgreSQL on Windows (winget)

```powershell
# Install PostgreSQL 16
winget install PostgreSQL.PostgreSQL.16

# Add to PATH if not done automatically
$env:Path += ";C:\Program Files\PostgreSQL\16\bin"

# Create the user and database
psql -U postgres -c "CREATE USER cms_user WITH PASSWORD 'cms_pass';"
psql -U postgres -c "CREATE DATABASE cms_db OWNER cms_user;"
```

`DATABASE_URL`:
```
postgresql://cms_user:cms_pass@localhost:5432/cms_db?schema=public
```

### Option C — Laragon (GUI, easiest on Windows)

1. Download Laragon Full at https://laragon.org/download
2. Start All → PostgreSQL runs on port 5432 (user: `root`, password: empty)
3. Laragon menu → Database → HeidiSQL → create a `cms_db` database

`DATABASE_URL`:
```
postgresql://root:@localhost:5432/cms_db?schema=public
```

---

## Step 2 — Clone & install dependencies

```powershell
git clone <repo-url> cms-monorepo
cd cms-monorepo
pnpm install
```

---

## Step 3 — Create the `.env` file

```powershell
Copy-Item .env.example apps\admin-api\.env
```

Open `apps\admin-api\.env`, fill in `DATABASE_URL` from Step 1, then replace both JWT secrets with
random strings (≥ 32 characters):

```powershell
# Generate a random secret
[System.Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Max 256) }))
```

For Google OAuth login (optional — see `apps/admin-api/AGENTS.md` Section 10 for the full flow),
also set:

```dotenv
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:3001/api/v1/auth/google/callback
FRONTEND_URL=http://localhost:5173
```

---

## Step 4 — Migrate & seed

```powershell
# Generate the Prisma Client from the schema
pnpm db:generate

# Create tables in the database
pnpm db:migrate

# Create roles, permissions, an admin user, and a sample homepage
pnpm db:seed
```

Expected output on a successful seed:

```
🌱 Seeding database...

📋 Creating permissions...
   ✓ 16 permissions ready

👥 Creating roles...
   ✓ admin: 16 permissions
   ✓ editor: 5 permissions
   ✓ viewer: 2 permissions

🔑 Creating admin user...
   ✓ admin@example.com (password: Admin@123456)

📄 Creating sample homepage...
   ✓ homepage (DRAFT) with 3 blocks

🎉 Seed complete!
```

---

## Step 5 — Run everything

```powershell
# Run all three apps at once
pnpm dev
```

Or run each app individually:

```powershell
pnpm --filter admin-api dev        # NestJS      → http://localhost:3001
pnpm --filter @cms/admin-web dev   # React/Vite  → http://localhost:5173
pnpm --filter @cms/web dev         # Next.js     → http://localhost:3000
```

| Service       | URL                               |
|---------------|-----------------------------------|
| Admin API     | http://localhost:3001/api/v1      |
| Swagger UI    | http://localhost:3001/api/docs    |
| Admin Web     | http://localhost:5173             |
| Public Site   | http://localhost:3000             |

---

## Quick check (PowerShell)

```powershell
# 1. Login — get an access token
$response = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/login" `
  -Method POST -ContentType "application/json" `
  -Body '{"email":"admin@example.com","password":"Admin@123456"}'

$token = $response.data.accessToken

# 2. List pages
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/pages" `
  -Headers @{ Authorization = "Bearer $token" }

# 3. Homepage detail (with blocks)
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/pages/homepage" `
  -Headers @{ Authorization = "Bearer $token" }

# 4. Create a new page
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/pages" `
  -Method POST `
  -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } `
  -Body '{"slug":"about-us","seoMeta":{"title":"About Us"}}'
```

Or use **Swagger UI** at http://localhost:3001/api/docs — click "Authorize" and enter
`Bearer <token>`.

---

## Database schema

```
Roles ──< RolePermissions >── Permissions
  │
Users ──< PageVersions ──< Blocks
            │
Pages >─────┘ (published_version_id)

Media (standalone)
```

### Why `pages` / `page_versions` / `blocks` are separate tables

**Page versioning** lets an editor work on a DRAFT while the PUBLISHED version keeps serving the
live site. "Publish" is just updating the `pages.published_version_id` pointer — it never
overwrites live data, and you can roll back at any time by repointing it.

**Blocks are their own table** (not a JSONB array on the page) so that reordering is cheap and
safe without rewriting the whole row, blocks can be queried by `type`, and the page row doesn't
grow unbounded. Each block's `data: jsonb` column stays JSON because every block type has a
different shape — schema validation happens at the application layer via Zod (from
`block-registry`), not duplicated at the database layer.

---

## API Endpoints

### Auth

| Method | Path                          | Description                                    |
|--------|-------------------------------|-------------------------------------------------|
| POST   | `/api/v1/auth/login`          | Log in → `accessToken` + refresh cookie          |
| POST   | `/api/v1/auth/refresh`        | Use the cookie → new access token                |
| POST   | `/api/v1/auth/logout`         | Revoke the refresh token                         |
| GET    | `/api/v1/auth/me`             | Current user info                                |
| GET    | `/api/v1/auth/google`         | Start Google OAuth login (redirects to Google)   |
| GET    | `/api/v1/auth/google/callback`| Google OAuth callback (existing users only)      |

### Pages

| Method | Path                                                | Permission      |
|--------|-----------------------------------------------------|-----------------|
| GET    | `/api/v1/pages`                                     | `page:read`     |
| GET    | `/api/v1/pages/:idOrSlug`                           | `page:read`     |
| POST   | `/api/v1/pages`                                     | `page:create`   |
| PATCH  | `/api/v1/pages/:id`                                 | `page:update`   |
| DELETE | `/api/v1/pages/:id`                                 | `page:delete`   |
| POST   | `/api/v1/pages/:id/draft`                           | `page:update`   |
| POST   | `/api/v1/page-versions/:id/publish`                 | `page:publish`  |
| POST   | `/api/v1/page-versions/:id/revert`                  | `page:update`   |
| PATCH  | `/api/v1/page-versions/:id/seo-meta`                | `page:update`   |

### Blocks (nested under a page version)

| Method | Path                                                    | Permission    |
|--------|----------------------------------------------------------|---------------|
| GET    | `/api/v1/blocks`                                         | `page:read`   |
| POST   | `/api/v1/page-versions/:versionId/blocks`                | `page:update` |
| PATCH  | `/api/v1/page-versions/:versionId/blocks/reorder`        | `page:update` |
| PATCH  | `/api/v1/page-versions/:versionId/blocks/:blockId`       | `page:update` |
| DELETE | `/api/v1/page-versions/:versionId/blocks/:blockId`       | `page:update` |

### Users & Roles

| Method | Path                          | Permission    |
|--------|-------------------------------|---------------|
| GET    | `/api/v1/users`               | `user:read`   |
| GET    | `/api/v1/users/:id`           | `user:read`   |
| POST   | `/api/v1/users`               | `user:create` |
| GET    | `/api/v1/roles`                | `role:read`   |
| GET    | `/api/v1/roles/permissions/list` | `role:read` |
| POST   | `/api/v1/roles`                | `role:create` |
| PATCH  | `/api/v1/roles/:id`            | `role:update` |
| PATCH  | `/api/v1/roles/:id/permissions`| `role:update` |
| DELETE | `/api/v1/roles/:id`            | `role:delete` |

Every route (including `GET`) requires a permission — the only exceptions are the public
`public-pages.controller.ts` endpoints (consumed by `apps/web`) and the two Google OAuth routes.
Full details: `apps/admin-api/AGENTS.md`, Section 5.

---

## Block Registry

`packages/block-registry` is the center of the whole system. As of 2026-07, each block's Editor
component lives in a separate entry point from its schema/metadata:

```
packages/block-registry/src/
├── blocks/
│   └── hero/
│       ├── schema.ts      # Zod schema — pure TS, safe for NestJS to import
│       ├── Editor.tsx     # React form, used by admin-web (and apps/web Live Edit Mode)
│       ├── renderer.tsx   # React component for Next.js
│       └── index.ts       # exports BlockDefinition (no Editor field) + Renderer
├── registry.ts            # BlockDefinition list + getBlockDefinition(type)
└── editors.ts             # separate entry point: getBlockEditor(type), @cms/block-registry/editors
```

`schema.ts` never imports React or any UI dependency — that's what lets NestJS use the package
without pulling React into the backend. The Editor component is intentionally kept out of
`registry.ts`/`index.ts` for the same reason (`admin-api`'s build has no `--jsx`); it's imported
only via the `@cms/block-registry/editors` subpath. See `packages/block-registry/AGENTS.md` for
the full rationale and the block-authoring checklist.

**Adding a new block** requires:
1. Create `blocks/<block-name>/` with `schema.ts`, `Editor.tsx`, `renderer.tsx`, `index.ts`
2. Register it in `registry.ts` (one line)
3. Register the Editor in `editors.ts` (`blockEditors['xxx'] = XxxEditor`)

No controller changes, no Next.js route changes, no scattered `switch`/`case` on `type`.

---

## Detailed directory structure

### admin-api (NestJS)

```
src/
├── modules/
│   ├── auth/          # JWT strategy, guards, refresh token rotation, Google OAuth
│   ├── pages/          # Page CRUD, title, template filtering
│   ├── page-versions/  # DRAFT/PUBLISHED/ARCHIVED lifecycle, publish, revert
│   ├── blocks/         # Block CRUD + Zod validation from block-registry
│   ├── media/           # Upload, sharp-based optimization (3 WebP variants), usage scan
│   ├── roles/           # RBAC: roles, permissions, role-permission assignment
│   └── users/           # User CRUD
├── common/
│   ├── filters/        # HTTP exception filter — standard response envelope
│   ├── interceptors/   # Response interceptor
│   └── pipes/           # ZodValidationPipe
└── prisma/              # PrismaService
```

### admin-web (React + Vite)

```
src/
├── api/               # typed fetch wrappers (auth, pages, blocks, page-versions, media, roles)
├── components/        # UI components + layout (AppShell, Sidebar, TopNav)
├── context/           # AuthContext, AppLayoutContext
├── hooks/             # useAuth, usePages, useMedia, useUsers, useRoles, usePermissions
└── pages/
    ├── auth/                    # LoginPage, GoogleCallbackPage
    ├── content-management/
    │   ├── ContentManagementPage.tsx  # page list, filtered by template
    │   ├── PageEditPage.tsx           # main page editor + Live Edit Mode
    │   ├── BlockPickerModal.tsx       # pick a block from the registry
    │   └── components/
    │       ├── BlockDataForm.tsx      # resolves the Editor via getBlockEditor(type)
    │       ├── BlockSectionCard.tsx
    │       └── CreatePageModal.tsx
    ├── roles/                   # RolesPage — role list + permission matrix
    └── media/                   # MediaLibraryPage
```

### web (Next.js)

```
app/
├── [slug]/page.tsx      # catch-all for every dynamic page
├── api/revalidate/      # revalidateTag webhook, fired when admin-api publishes
└── layout.tsx
components/
├── blocks/               # renderer wrappers, read from the block registry
└── edit-mode/             # AdminNavbar, EditModeLayout — Live Edit Mode overlay for admins
lib/
└── pages.ts               # typed fetch for a page by slug
```

---

## Database scripts

```powershell
pnpm db:generate   # generate the Prisma Client from the schema
pnpm db:migrate    # create/migrate database tables
pnpm db:seed       # seed roles, permissions, admin user, sample homepage
pnpm db:studio     # open Prisma Studio at http://localhost:5555
```

---

## Troubleshooting

### "Can't reach database server"

```powershell
# Check the PostgreSQL service (Windows)
Get-Service -Name postgresql*

# Check the port
Test-NetConnection -ComputerName localhost -Port 5432
```

### "P1001: Can't reach database" with Neon

Add `?sslmode=require` to the end of the connection string.

### "password authentication failed"

```powershell
psql -U postgres -c "\du"   # list users and roles
```

### Full database reset

```powershell
pnpm --filter admin-api prisma migrate reset
# Confirm → wipes all data → reruns migrations → auto-seeds
```

For deeper troubleshooting (Prisma migration drift, CORS, Google OAuth, module-not-found after
`git pull`, etc.), see `apps/admin-api/AGENTS.md`, Section 7.
