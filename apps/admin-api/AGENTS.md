# AGENTS.md — apps/admin-api

> Đọc `/AGENTS.md` (root) trước nếu chưa đọc — file này chỉ bổ sung quy ước riêng của NestJS app,
> không lặp lại invariant chung (đã có ở root mục 1). Giải thích "vì sao" các invariant liên quan
> tới app này: xem `/ARCHITECTURE-DESIGN.md`.

## Quy ước riêng app này

- **Repository pattern bắt buộc**: mọi Prisma query đi qua `*.repository.ts`
  (`PagesRepository`, `BlocksRepository`...). Không gọi `this.prisma.page.findMany` thẳng trong
  `*.service.ts`.
- **Response envelope** (`common/interceptors/response.interceptor.ts`):
  `{ success: true, data, meta? }` hoặc `{ success: false, error: { code, message, details } }`.
  Không return raw object/array từ controller.
- **Validate `blocks.data` bằng Zod từ `@cms/block-registry`** ở `BlocksService.validateBlockData()`.
  Không thêm class-validator decorator song song cho field JSONB này.
- **Không render HTML** — chỉ trả JSON. Task "làm block đẹp hơn" không thuộc app này.
- **Publish** = update `pages.publishedVersionId`, không UPDATE trực tiếp version đang published.

## Lệnh hay dùng

```bash
pnpm --filter admin-api dev      # :3001
pnpm --filter admin-api build
pnpm --filter admin-api test
pnpm db:generate                 # bắt buộc sau khi sửa prisma/schema.prisma
```

## Known gap tại chỗ

`package.json` thiếu `"prisma": { "seed": "ts-node prisma/seed.ts" }` — nếu `db:seed` báo lỗi
"no seed script defined", thêm field này (chi tiết: root AGENTS.md mục 4).