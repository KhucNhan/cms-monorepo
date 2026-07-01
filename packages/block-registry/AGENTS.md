# AGENTS.md — packages/block-registry

> Đây là package quan trọng nhất repo — nếu task đụng "thêm/sửa field của block", luôn bắt đầu và
> kết thúc ở đây. Đọc `/AGENTS.md` (root) mục 1 và mục 3 trước (invariant + quy trình chi tiết).

## Quy tắc cứng của package này

- `blocks/*/schema.ts` **không import React, không import gì từ NestJS**. Đây là điều kiện để
  `admin-api` (Node thuần) import được. Logic UI-only (helperText, multiline...) đặt ở
  `packages/form-engine` (chưa scaffold — xem root AGENTS.md mục 4), không đặt ở đây.
- `switch (block.type)` **chỉ được phép trong `registry.ts`**. Mọi nơi khác gọi
  `getBlockDefinition(type)`.
- Mỗi block = 1 thư mục, 4 file: `schema.ts`, `editor.tsx`, `renderer.tsx`, `index.ts`.

## Checklist thêm block mới

1. `blocks/<ten-block>/schema.ts` — Zod schema, export `type XxxData = z.infer<typeof xxxSchema>`.
2. `editor.tsx` (dùng ở admin-web) + `renderer.tsx` (dùng ở web) trong cùng thư mục.
3. `index.ts` export `BlockDefinition` — xem `blocks/hero/index.ts` làm mẫu.
4. Thêm 1 dòng vào `registry.ts` (`definitions = [..., xxxBlock]`).
5. Dừng. Không sửa `admin-api/src/modules/blocks/*`, `web/lib/render-blocks.tsx`, hay
   `admin-web/.../BlockPickerModal.tsx` — cả ba đọc registry động.

## Sau khi sửa package này

Chạy lint/build ở **cả ba app** (`admin-api`, `@cms/admin-web`, `@cms/web`) — cả ba cùng import,
có thể type-error ở nơi không ngờ tới:

```bash
pnpm --filter admin-api build
pnpm --filter @cms/admin-web build
pnpm --filter @cms/web build
```

`admin-web`/`web` alias/transpile thẳng vào `src/` nên **không cần** `pnpm --filter
@cms/block-registry build` để thấy thay đổi lúc dev.