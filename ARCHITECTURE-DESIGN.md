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

## Thiết kế các chức năng mới (Phiên bản mới)

### 2. Quản lý phiên bản trang (Page Version Lifecycle)

- **Loại bỏ Version Archive Manager riêng biệt**: Thay vì có một trang quản lý Archive riêng gây phân mảnh trải nghiệm, toàn bộ lịch sử phiên bản (DRAFT, PUBLISHED, ARCHIVED) được hợp nhất trực tiếp trong bảng điều khiển **History** của Content management.
- **Sắp xếp ưu tiên trong Lịch sử**: DRAFT và PUBLISHED được xếp lên hàng đầu để người quản trị dễ dàng theo dõi trạng thái hiện tại. Các bản ARCHIVED cũ được sắp xếp theo thời gian mới nhất giảm dần ở phía dưới.
- **Quy trình "Set as Draft" (thay thế nút Revert cũ)**:
  - Khi người dùng muốn khôi phục một bản ghi cũ (ARCHIVED), họ chọn phiên bản đó và nhấn **Set as Draft**.
  - Hành động này sẽ **ghi đè/xóa** phiên bản DRAFT hiện tại nếu có (kèm cascade xóa các block liên kết trong DB) để đảm bảo tối đa một bản nháp hoạt động tại một thời điểm, tránh phân nhánh dữ liệu.
  - Clone dữ liệu từ bản ARCHIVED đích để tạo thành một DRAFT mới để tiếp tục chỉnh sửa an toàn.
  - Cho phép xóa trực tiếp các bản ghi DRAFT hoặc ARCHIVED lỗi thời ngay trong danh sách lịch sử.

### 3. Hệ thống Thư viện phương tiện (Media Library & Asset Verification)

- **Trình bày lưới 2 hàng × 6 cột (PAGE_SIZE = 12)**: Giao diện thư viện được thiết kế hiển thị chuẩn 12 items trên một trang để đảm bảo tính thẩm mỹ, cân đối trên mọi kích thước màn hình.
- **Chỉnh sửa tên trực tiếp (Inline Rename)**: Tên file (tên ảnh) hiển thị trực tiếp và có thể nhấp đúp/chỉnh sửa thông qua một input inline mà không cần mở modal chi tiết phức tạp.
- **Cơ chế cảnh báo xóa phương tiện (Recursive Usage Check)**:
  - Khi thực hiện xóa một ảnh/media, hệ thống sẽ thực hiện quét đệ quy qua toàn bộ dữ liệu JSONB (`data`) của tất cả các blocks hiện có trong cơ sở dữ liệu để tìm kiếm các thuộc tính `mediaId` khớp với file cần xóa.
  - Quá trình kiểm tra này hoàn toàn **bỏ qua trạng thái của pageVersion** (kể cả ảnh đó nằm trong bản DRAFT, PUBLISHED hay ARCHIVED của bất cứ trang nào đều được ghi nhận).
  - Nếu phát hiện tệp đang được sử dụng ở bất kỳ đâu, hệ thống sẽ bật cảnh báo hiển thị danh sách chi tiết các vị trí block/page đang liên kết để người dùng xác nhận trước khi xóa (tránh lỗi đứt gãy liên kết hình ảnh).

### 4. Quản lý SEO & Slug trang (Inline Page Info Editing)

- Người dùng có thể chỉnh sửa trực tiếp thuộc tính `slug` của trang và metadata SEO (`seoMeta.title`, `seoMeta.description`) ngay trong giao diện chỉnh sửa trang (PageEditPage).
- Thay đổi này được lưu trữ đồng bộ cùng với các khối nội dung khi người dùng lưu bản nháp (**Save Draft**).
- Thay đổi slug/metadata SEO sẽ chuyển trạng thái của trang thành DRAFT, và chỉ chính thức áp dụng lên môi trường public sau khi được nhấn **Publish**.
- **Cập nhật: tách "Page Info" thành 2 section UI độc lập, đều collapsible** — một cho
  `title`/`slug` (Page-level), một cho `seoMeta.title`/`seoMeta.description` (PageVersion-level).
  Lý do tách: 2 nhóm field này có **vòng đời lưu khác nhau về bản chất** (xem mục 6 bên dưới) — gộp
  chung 1 card trước đây khiến người dùng lầm tưởng cả 2 đều chỉ áp dụng sau khi Publish, trong khi
  `title` thực ra áp dụng ngay. Tách UI giúp lộ rõ ranh giới đó, dù cả 2 vẫn cùng được gửi trong 1
  lần bấm Save Draft để giữ trải nghiệm 1-click.

### 5. Giao diện thu gọn thanh bên (Collapsible Sidebar)

- Sidebar của admin panel hỗ trợ cơ chế collapse/expand để tối đa hóa không gian thao tác nội dung.
- Quản lý trạng thái thông qua Zustand store trung tâm (`useSidebarStore`) để đồng bộ mượt mà chiều rộng của cả sidebar và khung nội dung chính (TopNav và AppLayout).
- Nút kích hoạt toggle thu gọn được đặt đồng nhất ở vị trí góc trái của thanh điều hướng phía trên (TopNav).
- **Cập nhật**: title của app được đặt cố định phía trên danh sách menu (không chung hàng với item
  đầu tiên) để làm mốc nhận diện khi sidebar mở, và icon toggle đổi thành chevron `<`/`>` thay vì
  icon hamburger mặc định — lý do: hamburger dễ bị hiểu nhầm là "mở menu con" thay vì "thu gọn toàn
  bộ sidebar", trong khi `<`/`>` thể hiện trực quan hướng thu/giãn của chính sidebar.

### 6. Page Title — field mới, tách biệt SEO title (bổ sung sau đợt review Content Management List)

- **Vấn đề trước khi có field này**: `Page` không có tên hiển thị riêng — mọi nơi cần "tên trang"
  (Content Management list, Navbar public site) đều phải mượn tạm `seoMeta.title` (vốn có mục đích
  khác: nội dung thẻ `<title>` cho SEO/social share) hoặc fallback về `slug`. Điều này khiến 2 khái
  niệm khác nhau — "tên hiển thị nội bộ để admin nhận diện trang" và "tiêu đề SEO công khai" — bị
  trộn lẫn vào 1 field, không cho phép khác nhau khi cần (ví dụ tên nội bộ ngắn gọn "Trang chủ" nhưng
  SEO title dài hơn "Trang chủ | CMS Site — Giải pháp quản trị nội dung").
- **Quyết định thiết kế**: thêm cột `Page.title` (scalar, không versioned) — sống ở `Page`, tách
  biệt hoàn toàn khỏi `PageVersion.seoMeta.title`. Do nằm ở `Page` (không phải `PageVersion`), field
  này **không đi qua vòng đời DRAFT/PUBLISHED** như `seoMeta` — update ngay lập tức, không cần
  Publish. Đây là đánh đổi có chủ đích: `title` được xem như metadata quản trị (giống `slug`), không
  phải "nội dung xuất bản" cần kiểm duyệt qua version.
  - Hệ quả cần biết: sửa `title` rồi chỉ bấm "Save Draft" (chưa Publish) vẫn khiến `title` mới hiển
    thị ngay trên Content Management list và (gián tiếp, qua fallback) trên `public-pages`
    endpoint — khác hẳn hành vi của `seoMeta`, vốn chỉ lộ ra sau Publish. Nếu sau này có yêu cầu
    `title` cũng phải versioned/chờ Publish giống `seoMeta`, đó là thay đổi kiến trúc (di chuyển
    `title` sang `PageVersion`), không phải bugfix.
- **Navbar (`apps/web`) chủ động KHÔNG dùng `Page.title`** — quyết định sản phẩm riêng: nhãn menu
  công khai luôn suy ra từ `slug` (hàm `slugToLabel()`), độc lập hoàn toàn với việc admin sửa
  `title` ở CMS. Lý do: tách bạch "tên quản trị nội bộ" khỏi "nhãn điều hướng công khai" — tránh
  trường hợp admin đổi `title` cho mục đích nội bộ (vd phân loại, ghi chú) nhưng vô tình làm đổi
  luôn menu mà người dùng cuối đang thấy. `public-pages.controller.ts` vẫn trả `title` trong response
  (ưu tiên `page.title` → `seoMeta.title` → `slug`) để các consumer khác của `apps/web` (nếu có, vd
  trang chi tiết, sitemap) có thể dùng khi cần — chỉ riêng `Navbar` chủ động bỏ qua field này.

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

### Cập nhật sau khi triển khai Roles & Permissions

- `PermissionResource` mở rộng thêm `'role'` (bên cạnh `'page' | 'media' | 'user'` gốc) để hỗ trợ
  RBAC cho chính module role — mọi nơi dùng `@RequirePermissions()` với resource `role` phải build
  lại `@cms/shared-types` trước khi `admin-api` thấy type mới, vì package này build ra `dist/`
  (khác `block-registry` alias thẳng `src/`).
- Repository pattern nêu ở mục 1 phía trên là mục tiêu thiết kế, **không phản ánh code thật hiện
  tại** — xem root AGENTS.md mục 1.1 để biết deviation cụ thể.