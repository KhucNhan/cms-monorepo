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
| `BlockDataForm.tsx` lấy Editor qua `@cms/block-registry/editors` (`getBlockEditor()`), không đọc `getBlockDefinition().Editor` | Chi tiết + lý do tách: `packages/block-registry/AGENTS.md` |
| `tailwind.config.js` dùng chung token Material You với `admin-web` (đã đồng bộ 2026-07) | Đồng bộ thủ công, chưa có preset dùng chung — khi `admin-web` đổi màu/token phải copy tay sang đây, xem `packages/block-registry/AGENTS.md` phần Tailwind |

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
(overlay `fixed inset-0`, `z-[9998]`) là toàn bộ cơ chế Live Edit Mode cho admin đang xem public
site. Vài gotcha đã tốn effort để debug — không lặp lại:

- **`EditModeLayout` phải khóa scroll của `<body>`** khi mount (`document.body.style.overflow =
  'hidden'`, cleanup trả lại giá trị cũ khi unmount). Không khóa → con lăn chuột cuộn `<body>`
  bên dưới overlay thay vì cuộn bên trong `EditPanel`/`PagePreview`, gây cảm giác "scroll trong
  Edit Mode không hoạt động".
- **Chuỗi `min-h-0` phải xuyên suốt mọi flex/grid cha-con** trong `EditModeLayout` → `EditPanel` /
  `PagePreview`. Flex item mặc định có `min-height: auto`, không tự co nhỏ hơn nội dung — thiếu
  `min-h-0` ở bất kỳ tầng nào khiến `overflow-y-auto` ở tầng con không bao giờ kích hoạt được.
  Quy tắc: mỗi cột chỉ có **đúng 1 tầng** `overflow-y-auto` (không lồng 2 tầng cùng cuộn), các
  phần header/footer cố định (nút Add block, thanh Save/Publish, viewport switcher toolbar) đều
  phải `shrink-0`.
- **Effect `useEffect` fetch draft cần `didFetchRef` (chặn double-fetch của Strict Mode) TÁCH
  RIÊNG khỏi cờ "còn mounted" (`mountedRef`)** — không dùng chung 1 biến `cancelled` cho cả 2 mục
  đích. Nếu gộp chung, Strict Mode's cleanup-rồi-remount sẽ đánh `cancelled = true` (thuộc closure
  của lần chạy effect thứ nhất) trước khi request thật (duy nhất) kịp resolve → `setLoading(false)`
  không bao giờ chạy → màn hình "Loading draft…" bị hang vĩnh viễn.
- **`PagePreview` có 3 preset viewport (Mobile 375px / Tablet 768px / Desktop full-width) + kéo
  tay cầm 2 bên để resize tự do (320–1920px, tự chuyển sang preset `custom`)**. Khung giả lập
  kích thước thiết bị (`div` bọc `blocks.map(...)`) **không được** tự đặt `overflow-y-auto` — nó
  chỉ là khung hiển thị, chiều cao co theo nội dung (`h-fit`/tự nhiên); tầng cha bên ngoài mới là
  nơi cuộn thật (`min-h-0 flex-1 overflow-y-auto`).