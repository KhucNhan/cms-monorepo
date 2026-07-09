# AGENTS.md — apps/web

> Read `/AGENTS.md` (root) first. This file only covers conventions specific to `apps/web`.

## Mandatory rules

| Rule | Detail |
|---|---|
| Never import Prisma / query Postgres directly | All data comes through the Admin API, with a single call site: `lib/cms-client.ts` (**does not exist yet** in current code — if it needs to be added, this is where it belongs, not scattered fetch calls across `page.tsx`/`route.ts`). A Prisma import found anywhere in this app is an architecture error — report it, don't fix it in place. |
| `@cms/block-registry` via `transpilePackages` | Configured in `next.config.ts` — no need to build the package during dev, Next transpiles directly from `src/`. |
| `render-blocks.tsx` maps `block[]` → Renderer via the registry | Adding a new block type does **not** require editing this file (the registry supplies it automatically). |
| `tailwind.config.js` is nearly empty (`theme.extend: {}`) | `admin-web`'s Material You color tokens haven't been synced here — see the gap noted in `apps/admin-web/AGENTS.md`, "Known gap" section. |
| Main dynamic route: `app/[slug]/page.tsx` | Revalidated via webhook `app/api/revalidate/route.ts` when admin-api publishes — don't add a separate parallel caching mechanism. |

## Common commands

```bash
pnpm --filter @cms/web dev     # :3000
pnpm --filter @cms/web build
pnpm --filter @cms/web lint
```

## Required env (`.env.local`)

```dotenv
API_URL=http://localhost:3001          # or the real admin-api URL
REVALIDATE_SECRET=<must match admin-api/.env>
```