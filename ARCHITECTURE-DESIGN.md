# ARCHITECTURE-DESIGN.md

> Purpose: explains **why** the invariants in root `AGENTS.md` exist, and documents design
> decisions for newer features. Read `AGENTS.md` first for "what to do"; read this file only
> when you need the reasoning behind a rule, or before proposing a change that would violate one.
>
> Agent note: every invariant below has an explicit trigger (when it applies) and consequence
> (what breaks if violated). If a task seems to require violating one, stop and flag it instead
> of proceeding — see the "STOP conditions" callouts.

## 1. Core Invariants — Rationale

| # | Rule | Why it exists | Consequence if broken | STOP condition |
|---|------|----------------|------------------------|----------------|
| 1.1 | `packages/block-registry/src/blocks/*/schema.ts` must NOT import React or anything from NestJS | `admin-api` is pure Node.js and imports this package directly; a React/NestJS import breaks that import | Backend build fails or silently bundles frontend code | If a task needs UI-only logic (helperText, multiline, etc.), it belongs in `form-engine` field config, NOT `schema.ts` — flag if `form-engine` doesn't exist yet |
| 1.2 | Never write `switch (block.type)` or `if (type === 'hero')` outside `packages/block-registry/src/registry.ts` | Centralizes block lookup so new block types don't require hunting down every hardcoded check | Adding a new block type silently fails wherever a hardcoded check was missed | If existing code violates this, treat it as tech debt to report, not a pattern to copy |
| 1.3 | `admin-api` (NestJS) never renders HTML — JSON only, via response envelope | Keeps API/frontend concerns separated; `apps/web` and `admin-web` own all rendering | Schema mismatch / broken contract between apps | If a task asks to "make a block look nicer" and the path leads into `apps/admin-api`, the task is likely misunderstood — clarify before editing |
| 1.4 | `blocks.data` (JSONB) is validated ONLY via Zod schema from `block-registry`, inside `BlocksService.validateBlockData()` | Single source of truth for validation | Adding `@IsString()` / class-validator decorators in parallel creates two validation sources that drift apart | Do not add class-validator decorators to block data DTOs, even for "extra safety" |
| 1.5 | Publish = update `pages.publishedVersionId` pointer only — never UPDATE the published version row directly | Keeps published content immutable; all edits go through a DRAFT first | Direct mutation of a published version corrupts published-vs-draft history | If a task's fix path involves updating a row with status `PUBLISHED`, stop and reconsider — draft-first is almost certainly required instead |
| 1.6 | `apps/web` never queries Postgres directly — always via Admin API (`lib/cms-client.ts`) | Keeps the public site decoupled from the DB schema and auth boundary | Public site breaks silently on schema changes; bypasses API-level authorization | A Prisma import found inside `apps/web` is an architecture violation — report it, don't "fix it" by keeping the import |

## 2. Page Version Lifecycle

- **No separate Version Archive page.** DRAFT / PUBLISHED / ARCHIVED versions are unified in a
  single **History** panel inside Content Management, to avoid fragmenting the workflow.
- **Sort order in History:** DRAFT and PUBLISHED pinned at top (current state); ARCHIVED versions
  below, sorted newest-first.
- **"Set as Draft" replaces the old Revert button:**
  1. User selects an ARCHIVED version → presses **Set as Draft**.
  2. If a DRAFT already exists, it is **overwritten/deleted** (cascade-deletes its blocks) —
     at most one active DRAFT per page at any time. This prevents branching drafts.
  3. Data is cloned from the target ARCHIVED version into a new DRAFT for safe editing.
  4. Stale DRAFT/ARCHIVED rows can be deleted directly from the History list.

## 3. Media Library & Asset Verification

- **Grid: 2 rows × 6 columns, `PAGE_SIZE = 12`** — fixed page size for consistent layout across
  screen sizes.
- **Inline rename** — filename is editable directly (double-click → inline input), no detail modal.
- **Recursive usage check before delete:**
  - Scans the JSONB `data` of **every block in every page version** (DRAFT, PUBLISHED, ARCHIVED —
    version status is ignored) for a matching `mediaId`.
  - If found anywhere, shows a warning listing the specific block/page locations before allowing
    deletion, to prevent broken image references.

## 4. SEO & Slug Management (Inline Page Info Editing)

- `slug` and SEO metadata (`seoMeta.title`, `seoMeta.description`) are editable directly on
  `PageEditPage`.
- Saved together with content blocks on **Save Draft** (single write).
- Editing slug/SEO metadata moves the page to DRAFT state; changes only reach the public site
  after **Publish**.
- **UI is split into two independent collapsible sections:**
  - Section A: `title` / `slug` — **Page-level**, applies immediately (no Publish needed).
  - Section B: `seoMeta.title` / `seoMeta.description` — **PageVersion-level**, applies only
    after Publish.
  - Reason for the split: these two field groups have genuinely different save lifecycles
    (see Section 6). A single combined card previously misled users into thinking both groups
    require Publish, when `title` in fact applies instantly. Both groups are still sent together
    in one Save Draft request to preserve the 1-click UX — only the *visual grouping* is split,
    not the save mechanism.

## 5. Collapsible Sidebar

- Sidebar supports collapse/expand to maximize content-editing space.
- State lives in a central Zustand store (`useSidebarStore`), synced across `Sidebar`, `TopNav`,
  and `AppLayout` widths.
- Toggle button: fixed at the top-left of `TopNav`.
- App title/logo is pinned above the menu list (not sharing a row with the first menu item) —
  acts as a stable anchor for "sidebar is open" recognition.
- Toggle icon is chevron `<` / `>`, not a hamburger icon — a hamburger implies "open a submenu,"
  which is the wrong mental model here; the chevron directly signals expand/collapse direction.

## 6. `Page.title` vs `PageVersion.seoMeta.title` — Do Not Confuse

**Problem before this field existed:** `Page` had no dedicated display name. Every place needing
"the page's name" (Content Management list, public Navbar) had to borrow `seoMeta.title`
(intended for the public `<title>` tag / social-share metadata) or fall back to `slug`. This
conflated two distinct concepts — *internal admin-facing label* vs *public SEO title* — into one
field, with no way to make them differ (e.g., short internal name "Home" vs. long SEO title
"Home | CMS Site — Content Management Solution").

**Design decision:** Added `Page.title` — a scalar column on `Page`, unversioned, fully separate
from `PageVersion.seoMeta.title`.

- Because it lives on `Page` (not `PageVersion`), `title` does **NOT** follow the DRAFT/PUBLISHED
  lifecycle that `seoMeta` does — it updates immediately, no Publish required.
- This is an intentional tradeoff: `title` is treated as admin metadata (like `slug`), not
  publish-gated content.
- **Consequence agents must know:** editing `title` and pressing only **Save Draft** (no Publish)
  still makes the new `title` show immediately on the Content Management list and — indirectly,
  via fallback — on the `public-pages` endpoint. This differs from `seoMeta`, which only surfaces
  after Publish. If a future request asks to make `title` versioned/publish-gated like `seoMeta`,
  that is an **architecture change** (move `title` to `PageVersion`), not a bugfix — flag it as such.

- **`apps/web` Navbar deliberately does NOT use `Page.title`.** Public menu labels are always
  derived from `slug` via `slugToLabel()`, independent of whatever `title` the admin sets. Reason:
  keeps "internal admin label" separate from "public nav label," so an admin renaming `title` for
  internal classification/notes doesn't accidentally change end-user-visible navigation.
  `public-pages.controller.ts` still returns `title` in its response (fallback order:
  `page.title` → `seoMeta.title` → `slug`) for other consumers of `apps/web` that may need it
  (e.g., detail pages, sitemap) — only `Navbar` specifically ignores this field.

## 7. Roles & Permissions — Post-Implementation Notes

- `PermissionResource` now includes `'role'` alongside the original `'page' | 'media' | 'user'`,
  to support RBAC on the role module itself.
- **Build order matters:** anywhere using `@RequirePermissions()` with resource `role` requires
  `@cms/shared-types` to be rebuilt first — `admin-api` only sees the new type after
  `pnpm --filter @cms/shared-types build`, because this package is imported from `dist/`
  (unlike `block-registry`, which is aliased directly to `src/`).
- The Repository pattern mentioned in Section 1 is a **design goal**, not current reality —
  see root `AGENTS.md` Section 1 "Known deviation" for the actual state (services inject
  `PrismaService` directly).

## 8. Google OAuth Login — Why Not Passport Guards

**Problem:** The initial implementation added `passport-google-oauth20` with the standard NestJS
pattern — a `GoogleStrategy` (`PassportStrategy`) plus `@UseGuards(AuthGuard('google'))` /
`GoogleAuthGuard` on `GET /auth/google/callback`. This is the textbook NestJS approach and works
fine on the default Express adapter.

**Why it broke here:** `admin-api` runs on the **Fastify** adapter (`AGENTS.md` Section 0), not
Express. Passport's guard integration assumes Express-style request/response objects and
middleware chaining; under Fastify this caused the callback route to hang or 500 rather than
completing the OAuth handshake — a category of bug that doesn't show up in most Nest+Passport
tutorials because they default to Express.

**Design decision:** Keep `GoogleStrategy`/`GoogleAuthGuard` as inert reference files, but do not
wire them into any route. Instead:
- `GET /auth/google` manually constructs the Google consent-screen URL and issues a raw
  `reply.code(302).redirect(...)` — no Passport involved.
- `GET /auth/google/callback` reads `?code=` off the Fastify request query directly and calls
  `AuthService.exchangeGoogleCode(code)`, which performs the token exchange
  (`POST https://oauth2.googleapis.com/token`) and userinfo fetch
  (`GET https://www.googleapis.com/oauth2/v2/userinfo`) via plain `axios` calls — no
  session/strategy/guard machinery at all.
- This keeps the controller in full control of the redirect in every branch (success, no matching
  account, upstream error), which also happens to make the "no account → redirect with
  `?error=no_account`" UX (see `AGENTS.md`, Auth gotcha) trivial to implement, whereas the
  Passport-guard version needed a guard override (`handleRequest`) just to avoid an unwanted 401.

**Consequence agents must know:** if a future task is "add [some other] OAuth provider," do **not**
default to the standard `PassportStrategy` + `@UseGuards` tutorial pattern for this codebase —
follow the manual-exchange pattern established here, or explicitly confirm whether the target
route runs under the Fastify or Express adapter first.

**Existing-users-only, no auto-provisioning:** `UsersService.findUserByGoogleProfile()` will
link a Google identity to an existing account by email (first login) or by `googleId` (subsequent
logins), but deliberately returns `null` — never creates a `User` row — when no account matches.
This mirrors the product requirement that accounts are still provisioned by an admin (via
`POST /users`), and Google Sign-In is purely an alternate login method for those pre-existing
accounts, not a self-service signup flow. If a future task asks for "let anyone sign up with
Google," that is a deliberate policy change, not a bugfix — flag it before implementing.

## 9. Live Edit Mode (`apps/web`) — DRAFT uniqueness & data enrichment

**Vấn đề trước khi fix:** `POST /pages/:id/draft` (`PageVersionsService.getOrCreateDraft`) được
gọi mỗi lần admin bật Edit Mode trên public site. Hàm này ban đầu:
1. Không có `orderBy` khi tìm DRAFT hiện có, và
2. Không có transaction/lock giữa bước "kiểm tra tồn tại" và bước "tạo mới",

nên khi 2 request tới gần như đồng thời (React 18 Strict Mode tự động double-invoke effect
trong dev là nguyên nhân phổ biến nhất, nhưng cũng có thể xảy ra do double-click hoặc 2 tab),
cả hai đều thấy "chưa có DRAFT" và cùng tạo mới — vi phạm invariant "tối đa 1 DRAFT/page"
(`AGENTS.md` §1.5) dù không có ai cố tình mutate version PUBLISHED trực tiếp.

**Quyết định thiết kế:** thay vì chỉ sửa ở tầng application (dễ tái phát nếu có endpoint mới nào
đó quên check), invariant này được đưa xuống **tầng DB** bằng partial unique index:
```sql
CREATE UNIQUE INDEX "page_versions_one_draft_per_page"
ON "page_versions" ("pageId") WHERE status = 'DRAFT';
```
Application code (`getOrCreateDraft`) vẫn giữ check "existing trước" như một fast path (tránh
round-trip lỗi không cần thiết ở trường hợp thông thường), nhưng giờ có thêm try/catch bắt
`P2002` làm lớp phòng thủ thứ hai — nếu thua race, refetch bản DRAFT "chiến thắng" thay vì trả lỗi.

**Vấn đề thứ hai, cùng khu vực:** `getOrCreateDraft`/`cloneVersionIntoNewDraft`/`revertToVersion`
trả `PageVersion.blocks` thẳng từ Prisma, không qua bước enrich `hero.image.url` từ bảng `Media`
(khác với `BlocksService.findByVersion()`, dùng bởi `GET /blocks`, vốn đã enrich). Hệ quả: vừa
vào Edit Mode, banner hero hiện "mất ảnh" (chỉ có `mediaId`, không có `url`) cho tới khi user tự
chọn lại ảnh (lúc đó `MediaPicker.onSelect` tự set `url` vào state client, che giấu triệu chứng
gốc). **Fix:** mọi hàm trả blocks ra ngoài API trong `PageVersionsService` đều đi qua
`enrichVersionBlocks()`, tái sử dụng `BlocksService.enrichBlockData()` — tránh viết lại logic
resolve media 2 lần ở 2 service khác nhau.

**Bài học chung cho cả 2 vấn đề:** bất kỳ hàm mới nào trong `PageVersionsService` mà (a) tạo
DRAFT hoặc (b) trả `blocks` ra ngoài, đều phải tuân theo 2 quy tắc trên — không coi 2 hàm hiện có
(`getOrCreateDraft`, `revertToVersion`) là ngoại lệ đặc biệt.

## 10. Block Picker Preview — Static Thumbnails, Not Live Rendering

**Problem:** `BlockPickerModal` originally only showed an icon + type name per block — users had
to insert a block blindly, then delete/undo it if it wasn't visually what they expected.

**Options considered:**
1. **Developer-authored static thumbnail** (a PNG/SVG committed alongside each block, referenced
   via a new `thumbnail` field on `BlockDefinition`).
2. **Auto-generate a thumbnail at build/dev time** by rendering each block's `Renderer` with
   `defaultData` through a headless browser (Puppeteer/Playwright) and screenshotting it.

**Decision: Option 1 (static thumbnail).**

**Why not Option 2:** it requires introducing a whole new rendering/screenshot pipeline (headless
browser dependency, native bindings, extra build step) purely to solve a cosmetic problem, for a
registry that currently has 3 block types. It also risks producing misleading previews if
`defaultData` doesn't represent a realistic/attractive instance of the block. This is
disproportionate infrastructure for the current scale — revisit only if the block count grows
substantially (e.g. 15+) and thumbnails become a maintenance burden to keep in sync by hand.

**Why Option 1 fits the existing invariants:** the thumbnail is a plain static asset path
(`BlockDefinition.thumbnail: string`, optional), not a component — so it does not violate
Invariant 1.1 (`schema.ts` must stay React/NestJS-free) and doesn't touch `admin-api` at all
(Invariant 1.3, backend never renders anything visual). Adding it is a pure additive change to the
`packages/block-registry` checklist (`AGENTS.md` Section 3), not an architecture change.

**Consequence agents must know:** thumbnails are **not guaranteed to stay visually in sync** with
a block's actual `Editor`/`Renderer` output if that block's design changes later — there is no
automated check for this. If a block's visual design changes significantly, updating its
thumbnail image is a manual follow-up step, easy to forget. If this becomes a recurring problem,
that's a signal to revisit Option 2, not a bug in the current implementation.

**UI interaction detail (why click, not hover):** hover-to-preview was tried first in
`BlockPickerModal` but felt accidental while scrolling a grid of many blocks — moving the mouse
across the grid kept flipping the preview panel unintentionally. Switched to an explicit
click-to-preview model, with a separate "Select" button to actually insert the block, so browsing
previews and committing to a choice are two clearly distinct actions. See `apps/admin-web/AGENTS.md`
Section 6.1 for the implementation.

## Known Gaps in Source Documentation

The following sections were referenced in earlier planning but do not exist as standalone
rationale documents in the current source set — do not fabricate them if asked to "restore" them:

- **"Block lifecycle, 5-step user story"** — the closest existing content is the actionable
  checklist in `packages/block-registry/AGENTS.md` ("Checklist: Adding a new block"). It is a
  procedure, not a rationale narrative, and should stay there rather than being duplicated here.
- **"Data flow — publish and revalidate"** — the closest existing content is the short mechanism
  description in `apps/web/AGENTS.md` ("Revalidate via webhook"). No source explains *why*
  webhook-based revalidation was chosen over alternatives (e.g., polling, direct DB triggers);
  treat this as an open question rather than inferring an answer.