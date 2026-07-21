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
| `BlockDataForm.tsx` gets the Editor via `@cms/block-registry/editors` (`getBlockEditor()`), not `getBlockDefinition().Editor` | Details + rationale for the split: `packages/block-registry/AGENTS.md` |
| `tailwind.config.js` shares Material You tokens with `admin-web` (synced as of 2026-07) | Synced manually, no shared preset yet — when `admin-web` changes a color/token, copy it here by hand, see `packages/block-registry/AGENTS.md`, Tailwind section |

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

## Live Edit Mode (`components/edit-mode/`)

`NavbarSwitcher.tsx` → `AdminNavbar.tsx` (floating toolbar, `z-[9999]`) + `EditModeLayout.tsx`
(overlay `fixed inset-0`, `z-[9998]`) is the entire Live Edit Mode mechanism for an admin viewing
the public site. A few gotchas that cost real debugging effort — don't repeat them:

- **`EditModeLayout` must lock `<body>` scroll** on mount (`document.body.style.overflow =
  'hidden'`, restoring the previous value on unmount cleanup). Without the lock, the mouse wheel
  scrolls the `<body>` underneath the overlay instead of scrolling inside `EditPanel`/`PagePreview`,
  making it feel like "scrolling in Edit Mode doesn't work."
- **The `min-h-0` chain must run through every parent/child flex or grid** in
  `EditModeLayout` → `EditPanel` / `PagePreview`. A flex item defaults to `min-height: auto` and
  won't shrink below its content — missing `min-h-0` at any layer means the child's
  `overflow-y-auto` never actually activates. Rule: each column has **exactly one** layer of
  `overflow-y-auto` (never nest two scrolling layers), and fixed header/footer parts (Add block
  button, Save/Publish bar, viewport switcher toolbar) must all be `shrink-0`.
- **The `useEffect` that fetches the draft needs `didFetchRef` (blocking Strict Mode's
  double-fetch) kept SEPARATE from the "still mounted" flag (`mountedRef`)** — don't reuse one
  `cancelled` variable for both purposes. If merged, Strict Mode's cleanup-then-remount sets
  `cancelled = true` (belonging to the first effect run's closure) before the one real request
  resolves → `setLoading(false)` never runs → the "Loading draft…" screen hangs forever.
- **`PagePreview` has 3 viewport presets (Mobile 375px / Tablet 768px / Desktop full-width) plus
  drag handles on both sides for free resizing (320–1920px, auto-switches to the `custom`
  preset)**. The device-size mock frame (the `div` wrapping `blocks.map(...)`) must **not** set its
  own `overflow-y-auto` — it's just a display frame whose height fits its content naturally
  (`h-fit`); the actual scrolling happens in the outer parent layer (`min-h-0 flex-1
  overflow-y-auto`).