# AGENTS.md — packages/block-registry

> Đây là package quan trọng nhất repo — nếu task đụng "thêm/sửa field của block", luôn bắt đầu và
> kết thúc ở đây. Đọc `/AGENTS.md` (root) mục 1 và mục 3 trước (invariant + quy trình chi tiết).

## ⚠️ Kiến trúc đã đổi (2026-07) — Editor tách khỏi `registry.ts`

**Khác với thiết kế ban đầu:** `BlockDefinition` (trả về từ `getBlockDefinition()`, dùng trong
`registry.ts`/`schema-only.ts`) **không còn field `Editor`**. Editor component (React) được tách
hẳn ra một entry point riêng: `src/editors.ts` (export qua subpath `@cms/block-registry/editors`).

**Lý do:** `schema-only.ts` (entry admin-api dùng — Node thuần, không có `--jsx`) từng vô tình kéo
theo `Editor.tsx` qua chuỗi `schema-only.ts → registry.ts → blocks/*/index.ts → Editor.tsx`, khiến
`admin-api` build lỗi (`tsc` báo `--jsx is not set`). Tách Editor ra `editors.ts` đảm bảo
`registry.ts` / `blocks/*/index.ts` / `schema-only.ts` **mãi mãi sạch React**.

**Hệ quả bắt buộc phải nhớ:** bất kỳ nơi nào ở `admin-web`/`apps/web` từng đọc
`getBlockDefinition(type).Editor` đều **phải sửa lại** thành:
```ts
import { getBlockEditor, JsonFallbackEditor } from '@cms/block-registry/editors';
const Editor = getBlockEditor(type) ?? JsonFallbackEditor;
```
`getBlockDefinition(type)` (từ `@cms/block-registry` gốc) chỉ còn dùng để lấy metadata
(label, icon, schema, defaultData) và để validate `type` hợp lệ — **không** còn dùng để lấy Editor.
Nếu quên bước này, hiện tượng gặp phải là "UI vẫn hiện JsonFallbackEditor thô dù code Editor mới
đã đúng" — đã từng xảy ra thật ở `admin-web`/`apps/web`, xem lịch sử debug trong PR liên quan.

## Cấu trúc thực tế 1 block (khác checklist gốc trước đây)

Mỗi block = 1 thư mục trong `src/blocks/<ten-block>/`:
- `schema.ts` — Zod schema, export `type XxxData = z.infer<typeof xxxSchema>`. **Không import
  React, không import gì từ NestJS.**
- `Editor.tsx` (viết hoa chữ E) — component React, **không** export qua `index.ts` của block,
  chỉ được import trực tiếp bởi `src/editors.ts` (entry point riêng).
- `index.ts` — export `BlockDefinition` (metadata + schema only, **không có `Editor`**).

`src/editors.ts` (entry riêng, KHÔNG nằm trong `index.ts` gốc) gom tất cả `Editor.tsx` của mọi
block vào 1 map (`blockEditors`), export `getBlockEditor(type)`.

## Quy tắc cứng của package này (không đổi)

- `blocks/*/schema.ts` **không import React, không import gì từ NestJS**. Logic UI-only
  (helperText, multiline...) đặt ở `packages/form-engine` (chưa scaffold — xem root AGENTS.md
  mục 4), không đặt ở đây.
- `switch (block.type)` **chỉ được phép trong `registry.ts`**. Mọi nơi khác gọi
  `getBlockDefinition(type)`.
- `renderer.tsx` (dùng bởi `apps/web` qua `render-blocks.tsx`) **vẫn nằm trong `index.ts` gốc**
  (không tách như Editor) — vì `apps/web` build bằng Next.js, có `--jsx`, không có xung đột như
  `admin-api`. Chỉ Editor mới cần tách vì admin-api hoàn toàn không dùng Editor.

## Checklist thêm block mới (đã cập nhật)

1. `blocks/<ten-block>/schema.ts` — Zod schema, export `type XxxData = z.infer<typeof xxxSchema>`.
2. `blocks/<ten-block>/Editor.tsx` — component Editor (dùng chung admin-web + apps/web qua prop
   `variant`, xem `blocks/hero/Editor.tsx` làm mẫu). `Renderer` (dùng ở `apps/web`) vẫn export
   trong `blocks/<ten-block>/index.ts` như cũ.
3. `blocks/<ten-block>/index.ts` — export `BlockDefinition` (**KHÔNG** gán field `Editor` vào đây
   nữa) + export `Renderer`.
4. Thêm 1 dòng vào `registry.ts` (`definitions = [..., xxxBlock]`).
5. **Bắt buộc thêm bước mới:** đăng ký `Editor.tsx` vào `src/editors.ts`
   (`blockEditors['xxx'] = XxxEditor`) — nếu quên bước này, block mới sẽ luôn rơi vào
   `JsonFallbackEditor` dù `registry.ts` đã đúng.
6. Dừng. Không sửa `admin-api/src/modules/blocks/*`, `web/components/blocks/index.tsx`
   (render-blocks), hay `admin-web/.../BlockPickerModal.tsx` — cả ba đọc registry động.

## Sau khi sửa package này

Chạy lint/build ở **cả ba app** (`admin-api`, `@cms/admin-web`, `@cms/web`) — cả ba cùng import,
có thể type-error ở nơi không ngờ tới:

```bash
pnpm --filter admin-api build
pnpm --filter @cms/admin-web build
pnpm --filter @cms/web build
```

`admin-web`/`web` alias/transpile thẳng vào `src/` (`@cms/block-registry` **và**
`@cms/block-registry/editors` — xem alias trong `vite.config.ts`/`next.config.ts`) nên **không
cần** `pnpm --filter @cms/block-registry build` để thấy thay đổi lúc dev. Vẫn cần build thật khi
build production (`admin-api` luôn resolve qua `dist/`, không alias thẳng src như 2 app kia).

## ⚠️ Version `react` / `@types/react` phải khớp TOÀN WORKSPACE

`peerDependencies.react` của package này là `>=19` (không phải `>=18` như bản cũ) — cả
`admin-web` và `apps/web` hiện đều chạy React 19. `devDependencies.@types/react` **phải pin cứng
đúng version** khớp với root `pnpm.overrides` (hiện tại: `19.2.3`) — **không dùng `^`**. Lý do:
`@types/react` và `@types/react-dom` phải cùng đúng 1 version release (không chỉ cùng major) vì
chúng định nghĩa chéo các type liên quan (`ReactNode`/`ReactPortal`); lệch dù chỉ patch version
(vd `19.2.17` vs `19.2.3` — và thực tế `19.2.17` còn **không tồn tại** cho `@types/react-dom`) gây
lỗi kiểu `'X.Provider' cannot be used as a JSX component` ở **toàn bộ** JSX trong 2 app tiêu thụ,
dù `tsc`/`pnpm why` ở package này không báo gì sai. Luôn kiểm tra bằng
`pnpm --filter <app> why @types/react-dom` (không phải `npm why` — khác cách quét workspace) sau
khi đổi version ở đây.

## ⚠️ Class Tailwind trong `Editor.tsx`/`Renderer.tsx` phụ thuộc token của app tiêu thụ

Editor/Renderer dùng chung dùng các custom color token kiểu Material You (`bg-primary`,
`text-on-surface`, `border-outline-variant`, `bg-error/10`, spacing `gap-xs`/`p-md`, font
`text-body-sm`/`text-label-sm`...) — đây **không phải Tailwind mặc định**, mà được định nghĩa thủ
công trong `tailwind.config.js` của **từng app tiêu thụ** (`admin-web` và `apps/web`), không nằm
trong package này. Nếu một app tiêu thụ thiếu token nào, class đó render ra **không màu, không
hover** một cách âm thầm (Tailwind không báo lỗi, chỉ không sinh CSS) — từng xảy ra thật với
`apps/web` (`tailwind.config.js` từng để `theme.extend: {}` rỗng). Khi thêm token màu/spacing/font
mới trong `Editor.tsx`/`Renderer.tsx`, **luôn đồng bộ thủ công sang cả 2
`tailwind.config.js`** (`apps/admin-web` và `apps/web`) — chưa có `packages/tailwind-preset` dùng
chung (đề xuất tách, chưa làm — xem root AGENTS.md mục 4 "Roadmap Phase 2").