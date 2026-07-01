# ARCHITECTURE-DESIGN.md

> File này giải thích **tại sao** các invariant trong `AGENTS.md` (root) tồn tại. Đây là tài
> liệu tham khảo sâu, không phải quick reference — nếu chỉ cần biết "phải làm gì" thay vì "vì
> sao", đọc `AGENTS.md` là đủ.
>
> Nội dung dưới đây được di chuyển nguyên văn từ mục 1 "Invariant" của root AGENTS.md (bản
> trước tái cấu trúc), giữ nguyên giải thích, không tóm tắt.

## Ghi chú từ AGENTS.md

### 1. Vì sao các invariant này tồn tại

- **`packages/block-registry/src/blocks/*/schema.ts` không được import React, không import bất kỳ gì từ NestJS.**
  Đây là điều kiện để `admin-api` (Node thuần) import được package mà không kéo React vào backend.
  Nếu cần thêm logic UI-only (helperText, multiline...) → đặt trong field config của `form-engine`
  (mục 7 tài liệu kiến trúc), **không** đặt trong `schema.ts`.

- **Không viết `switch (block.type)` hay `if (type === 'hero')` ở bất kỳ đâu ngoài
  `packages/block-registry/src/registry.ts`.** Muốn biết block nào tồn tại / lấy Editor / lấy Renderer
  → luôn gọi `getBlockDefinition(type)`, không hardcode danh sách.

- **NestJS không bao giờ render HTML.** `admin-api` chỉ trả JSON (`data: Block[]`). Nếu một task
  yêu cầu "làm cho block hiện đẹp hơn" mà đường dẫn liên quan tới `apps/admin-api` → đó là dấu hiệu
  hiểu sai task, dừng lại và hỏi lại.

- **`blocks.data` (JSONB) luôn được validate bằng Zod schema từ `block-registry` trước khi ghi DB**,
  ở `BlocksService.validateBlockData()`. Không thêm `@IsString()`/class-validator decorator song song —
  sẽ tạo ra hai nguồn validate lệch nhau.

- **Publish = đổi `pages.publishedVersionId`, không bao giờ UPDATE trực tiếp lên bản đang published.**
  Mọi thay đổi nội dung luôn đi qua version DRAFT mới nhất trước.

- **`apps/web` không bao giờ query Postgres trực tiếp.** Mọi dữ liệu lấy qua Admin API
  (`lib/cms-client.ts`). Nếu thấy import Prisma trong `apps/web` — đó là lỗi kiến trúc, báo lại thay vì sửa tiếp.

### TODO — thiếu nguồn

Bản mô tả tái cấu trúc gốc (task) giả định root AGENTS.md từng có thêm hai mục rationale riêng —
"mục 3: Block lifecycle, user story 5 bước" và "mục 4: Data flow — publish và revalidate" — tách
biệt khỏi phần invariant ở trên. Trong bộ 5 file nguồn thực tế đang có, **không tồn tại** hai đoạn
này dưới dạng narrative/rationale riêng:

- Nội dung gần nhất với "block lifecycle" là mục 3 của root AGENTS.md, nhưng đó là một **checklist
  hành động** (5-6 bước thao tác), không phải user story giải thích lý do — nên được giữ lại ở dạng
  actionable trong `packages/block-registry/AGENTS.md` (xem mục "Checklist thêm block mới"), không
  chuyển sang đây.
- Nội dung gần nhất với "data flow publish/revalidate" là phần "Route động chính... Revalidate qua
  webhook" trong `apps/web/AGENTS.md` — cũng là mô tả cơ chế thực thi ngắn, không phải rationale dài.
  Không có đoạn nguồn nào giải thích *vì sao* thiết kế revalidate theo webhook thay vì cơ chế khác.
