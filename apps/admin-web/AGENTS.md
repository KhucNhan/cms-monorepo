# AGENTS.md — apps/admin-web

> Đọc `/AGENTS.md` (root) trước nếu chưa đọc.

## Quy ước riêng app này

- **State**: dữ liệu server → TanStack Query (`hooks/use*.ts`). State UI thuần (block đang chọn,
  panel mở, cờ dirty) → Zustand. **Không** đẩy dữ liệu server vào Zustand store.
- **Chưa có `packages/ui`** — token màu Material You định nghĩa trực tiếp trong
  `tailwind.config.js` của app này. Đừng import từ `@cms/ui`, package đó chưa tồn tại.
- **Tailwind v3.4** (CommonJS `tailwind.config.js`, `theme.extend`) — không dùng cú pháp `@theme`
  của v4.
- **`@cms/block-registry` alias thẳng vào `src/`** qua `vite.config.ts` (`resolve.alias`) — sửa
  block-registry không cần build lại, chỉ cần refresh dev server.
- Block editor mới đăng ký qua `registry.ts`, **không** thêm `switch (block.type)` trong
  `BlockPickerModal.tsx` hay bất kỳ đâu trong app này.

## Lệnh hay dùng

```bash
pnpm --filter @cms/admin-web dev     # :5173, proxy /api và /uploads sang :3001
pnpm --filter @cms/admin-web build   # tsc -b && vite build
pnpm --filter @cms/admin-web lint
```

## Lưu ý

Canvas preview trong Page Editor tái dùng Renderer từ `block-registry`, nhưng theme Tailwind ở
`apps/web` gần như rỗng → preview hiện **không khớp giao diện thật**. Đây là gap đã biết, không
phải bug component nếu gặp task liên quan.