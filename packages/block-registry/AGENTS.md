# AGENTS.md — packages/block-registry

> This is the most important package in the repo — if a task touches "add/edit a block field,"
> always start and end here. Read `/AGENTS.md` (root) Sections 1 and 3 first (invariants + the
> detailed workflow).

## ⚠️ Architecture change (2026-07) — Editor split out of `registry.ts`

**Different from the original design:** `BlockDefinition` (returned by `getBlockDefinition()`,
used in `registry.ts`/`schema-only.ts`) **no longer has an `Editor` field**. The Editor component
(React) has been split into its own separate entry point: `src/editors.ts` (exported via the
subpath `@cms/block-registry/editors`).

**Why:** `schema-only.ts` (the entry point `admin-api` uses — plain Node, no `--jsx`) used to
accidentally pull in `Editor.tsx` through the chain
`schema-only.ts → registry.ts → blocks/*/index.ts → Editor.tsx`, which broke the `admin-api` build
(`tsc` reported `--jsx is not set`). Splitting Editor into `editors.ts` guarantees that
`registry.ts` / `blocks/*/index.ts` / `schema-only.ts` stay permanently React-free.

**Consequence you must remember:** anywhere in `admin-web`/`apps/web` that used to read
`getBlockDefinition(type).Editor` **must be updated** to:
```ts
import { getBlockEditor, JsonFallbackEditor } from '@cms/block-registry/editors';
const Editor = getBlockEditor(type) ?? JsonFallbackEditor;
```
`getBlockDefinition(type)` (from the root `@cms/block-registry`) is now only used to get metadata
(label, icon, schema, defaultData) and to validate that `type` is valid — **not** to get the
Editor anymore. If you forget this step, the symptom is "the UI still shows the raw
`JsonFallbackEditor` even though the new Editor code is correct" — this has actually happened in
`admin-web`/`apps/web`; see the debug history in the related PR.

## Actual structure of a block (differs from the older checklist)

Each block = one folder in `src/blocks/<block-name>/`:
- `schema.ts` — Zod schema, exports `type XxxData = z.infer<typeof xxxSchema>`. **No React
  imports, no imports from NestJS.**
- `Editor.tsx` (capital E) — React component, **not** exported through the block's `index.ts`;
  only imported directly by `src/editors.ts` (the dedicated entry point).
- `index.ts` — exports `BlockDefinition` (metadata + schema only, **no `Editor`**).

`src/editors.ts` (a separate entry point, NOT part of the root `index.ts`) collects every block's
`Editor.tsx` into one map (`blockEditors`) and exports `getBlockEditor(type)`.

## Hard rules for this package (unchanged)

- `blocks/*/schema.ts` **must not import React, must not import anything from NestJS**. UI-only
  logic (helperText, multiline, etc.) belongs in `packages/form-engine` (not scaffolded yet — see
  root AGENTS.md Section 4), not here.
- `switch (block.type)` is **only allowed in `registry.ts`**. Everywhere else must call
  `getBlockDefinition(type)`.
- `renderer.tsx` (used by `apps/web` via `render-blocks.tsx`) **still lives in the root
  `index.ts`** (not split out like Editor) — because `apps/web` builds with Next.js, which has
  `--jsx`, so there's no conflict like in `admin-api`. Only Editor needed to be split out, since
  `admin-api` never uses Editor at all.

## Checklist for adding a new block (updated)

1. `blocks/<block-name>/schema.ts` — Zod schema, export `type XxxData = z.infer<typeof xxxSchema>`.
2. `blocks/<block-name>/Editor.tsx` — the Editor component (shared between admin-web and apps/web
   via a `variant` prop — see `blocks/hero/Editor.tsx` as a reference). `Renderer` (used in
   `apps/web`) is still exported from `blocks/<block-name>/index.ts` as before.
3. `blocks/<block-name>/index.ts` — export `BlockDefinition` (do **NOT** assign an `Editor` field
   here anymore) + export `Renderer`.
4. Add one line to `registry.ts` (`definitions = [..., xxxBlock]`).
5. **New required step:** register `Editor.tsx` in `src/editors.ts`
   (`blockEditors['xxx'] = XxxEditor`) — if you forget this step, the new block will always fall
   back to `JsonFallbackEditor` even though `registry.ts` is correct.
6. Stop. Do not modify `admin-api/src/modules/blocks/*`, `web/components/blocks/index.tsx`
   (render-blocks), or `admin-web/.../BlockPickerModal.tsx` — all three read the registry
   dynamically.

## After modifying this package

Run lint/build in **all three apps** (`admin-api`, `@cms/admin-web`, `@cms/web`) — all three
import from here and can produce type errors in unexpected places:

```bash
pnpm --filter admin-api build
pnpm --filter @cms/admin-web build
pnpm --filter @cms/web build
```

`admin-web`/`web` alias/transpile straight into `src/` (both `@cms/block-registry` **and**
`@cms/block-registry/editors` — see the alias config in `vite.config.ts`/`next.config.ts`), so you
**don't need** `pnpm --filter @cms/block-registry build` to see changes during dev. A real build is
still needed for production (`admin-api` always resolves via `dist/`, unlike the other two apps
which alias straight to source).

## ⚠️ `react` / `@types/react` versions must match across the ENTIRE workspace

This package's `peerDependencies.react` is `>=19` (not `>=18` as in the old version) — both
`admin-web` and `apps/web` now run React 19. `devDependencies.@types/react` **must be pinned to the
exact version** matching root `pnpm.overrides` (currently `19.2.3`) — **do not use `^`**. Reason:
`@types/react` and `@types/react-dom` must be the exact same release (not just the same major)
because they cross-reference each other's types (`ReactNode`/`ReactPortal`); a mismatch even at the
patch level (e.g. `19.2.17` vs `19.2.3` — and `19.2.17` in fact **doesn't even exist** for
`@types/react-dom`) causes errors like `'X.Provider' cannot be used as a JSX component` across
**all** JSX in both consuming apps, even though `tsc`/`pnpm why` in this package itself reports
nothing wrong. Always verify with `pnpm --filter <app> why @types/react-dom` (not `npm why` — it
scans the workspace differently) after changing the version here.

## ⚠️ Tailwind classes in `Editor.tsx`/`Renderer.tsx` depend on the consuming app's tokens

The shared Editor/Renderer use custom Material-You-style color tokens (`bg-primary`,
`text-on-surface`, `border-outline-variant`, `bg-error/10`, spacing `gap-xs`/`p-md`, fonts
`text-body-sm`/`text-label-sm`, etc.) — these are **not** default Tailwind; they're manually defined
in each **consuming app's** `tailwind.config.js` (`admin-web` and `apps/web`), not in this package.
If a consuming app is missing a token, that class silently renders with **no color, no hover**
(Tailwind doesn't error, it just doesn't generate the CSS) — this actually happened with `apps/web`
(its `tailwind.config.js` used to have an empty `theme.extend: {}`). When adding a new
color/spacing/font token in `Editor.tsx`/`Renderer.tsx`, **always manually sync it to both**
`tailwind.config.js` files (`apps/admin-web` and `apps/web`) — there's no shared
`packages/tailwind-preset` yet (proposed but not done — see root AGENTS.md Section 4, "Roadmap
Phase 2").