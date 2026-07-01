# AGENTS.md — apps/web

> Đọc `/AGENTS.md` (root) trước nếu chưa đọc.

## Quy ước riêng app này

- **Không bao giờ import Prisma hay query Postgres trực tiếp.** Mọi dữ liệu lấy qua Admin API,
  điểm gọi duy nhất là `lib/cms-client.ts` (chưa tồn tại trong code hiện tại — nếu cần thêm, đây
  là nơi đặt, không rải fetch call ở `page.tsx`/`route.ts`). Nếu thấy import Prisma ở đâu trong
  app này — đó là lỗi kiến trúc, báo lại thay vì tự sửa tiếp.
- **`@cms/block-registry` qua `transpilePackages`** (`next.config.ts`) — không cần build package
  khi dev, Next tự transpile từ `src/`.
- `render-blocks.tsx` map `block[]` → Renderer theo registry — thêm block mới không sửa file này
  (registry tự động cung cấp).
- **`tailwind.config.js` gần như rỗng** (`theme.extend: {}`) — token màu Material You của
  `admin-web` chưa được đồng bộ sang đây (xem gap ở `apps/admin-web/AGENTS.md`).
- Route động chính: `app/[slug]/page.tsx`. Revalidate qua webhook `app/api/revalidate/route.ts`
  khi admin-api publish — không tự thêm cơ chế cache khác song song.

## Lệnh hay dùng

```bash
pnpm --filter @cms/web dev     # :3000
pnpm --filter @cms/web build
pnpm --filter @cms/web lint
```

## Env cần thiết

`.env.local` phải có `API_URL=http://localhost:3001` (hoặc URL admin-api thật) và
`REVALIDATE_SECRET` khớp với `admin-api/.env`.