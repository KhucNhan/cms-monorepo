# CMS Monorepo

> NestJS + PostgreSQL · React + Vite · Next.js App Router · pnpm workspaces · Turborepo

---

## Tổng quan kiến trúc

Hệ thống gồm ba app chạy độc lập, chia sẻ logic qua các package dùng chung:

```
cms-monorepo/
├── apps/
│   ├── admin-api/       # NestJS — Content API + Auth
│   ├── admin-web/       # React + Vite — giao diện quản trị
│   └── web/             # Next.js App Router — public site
└── packages/
    ├── block-registry/  # ⭐ nguồn sự thật duy nhất cho mọi block
    ├── shared-types/    # Page, User, Media, API envelope...
    └── tsconfig/        # base tsconfig dùng chung
```

```mermaid
flowchart LR
    subgraph Shared["packages/"]
        BR[block-registry<br/>schema · editor · renderer]
        ST[shared-types]
    end

    AdminWeb["admin-web<br/>React + Vite :5173"] -->|schema + editor| BR
    AdminAPI["admin-api<br/>NestJS :3001"]       -->|schema only| BR
    Web["web<br/>Next.js :3000"]                 -->|schema + renderer| BR

    AdminWeb -->|REST /api/v1| AdminAPI
    AdminAPI -->|Prisma| PG[(PostgreSQL)]
    Web       -->|GET /pages/:slug| AdminAPI
    AdminAPI  -->|revalidateTag webhook| Web
```

Nguyên tắc cốt lõi: **`block-registry` là nguồn sự thật duy nhất**. `schema.ts` của mỗi block là pure TypeScript/Zod — không phụ thuộc React — nên cả ba app đều import được. Thêm block mới = tạo một thư mục, không sửa code rải rác ở nhiều nơi.

---

## Yêu cầu

| Tool       | Version  |
|------------|----------|
| Node.js    | ≥ 20     |
| pnpm       | ≥ 9      |
| PostgreSQL | ≥ 15     |

---

## Bước 1 — Cài PostgreSQL

Chọn **một** trong ba cách:

### Cách A — Neon (cloud, không cài gì — khuyến nghị)

1. Vào https://neon.tech → đăng ký miễn phí
2. Tạo project → copy **Connection string**:
   ```
   postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. Dán vào `DATABASE_URL` trong file `.env`

### Cách B — PostgreSQL local trên Windows (winget)

```powershell
# Cài PostgreSQL 16
winget install PostgreSQL.PostgreSQL.16

# Thêm vào PATH nếu chưa tự động
$env:Path += ";C:\Program Files\PostgreSQL\16\bin"

# Tạo user và database
psql -U postgres -c "CREATE USER cms_user WITH PASSWORD 'cms_pass';"
psql -U postgres -c "CREATE DATABASE cms_db OWNER cms_user;"
```

`DATABASE_URL`:
```
postgresql://cms_user:cms_pass@localhost:5432/cms_db?schema=public
```

### Cách C — Laragon (GUI, dễ nhất trên Windows)

1. Tải Laragon Full tại https://laragon.org/download
2. Start All → PostgreSQL chạy ở cổng 5432 (user: `root`, pass: rỗng)
3. Menu Laragon → Database → HeidiSQL → tạo database `cms_db`

`DATABASE_URL`:
```
postgresql://root:@localhost:5432/cms_db?schema=public
```

---

## Bước 2 — Clone & cài dependencies

```powershell
git clone <repo-url> cms-monorepo
cd cms-monorepo
pnpm install
```

---

## Bước 3 — Tạo file `.env`

```powershell
Copy-Item .env.example apps\admin-api\.env
```

Mở `apps\admin-api\.env`, điền `DATABASE_URL` từ Bước 1, sau đó đổi hai JWT secret thành chuỗi ngẫu nhiên (≥ 32 ký tự):

```powershell
# Tạo secret ngẫu nhiên
[System.Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Max 256) }))
```

---

## Bước 4 — Migrate & Seed

```powershell
# Tạo Prisma Client từ schema
pnpm db:generate

# Tạo bảng trong database
pnpm db:migrate

# Tạo roles, permissions, admin user và homepage mẫu
pnpm db:seed
```

Output khi seed thành công:

```
🌱 Seeding database...

📋 Creating permissions...
   ✓ 12 permissions ready

👥 Creating roles...
   ✓ admin: 12 permissions
   ✓ editor: 5 permissions
   ✓ viewer: 2 permissions

🔑 Creating admin user...
   ✓ admin@example.com (password: Admin@123456)

📄 Creating sample homepage...
   ✓ homepage (DRAFT) with 3 blocks

🎉 Seed complete!
```

---

## Bước 5 — Chạy toàn bộ hệ thống

```powershell
# Chạy cả ba app cùng lúc
pnpm dev
```

Hoặc chạy từng app riêng:

```powershell
pnpm --filter admin-api dev    # NestJS      → http://localhost:3001
pnpm --filter @cms/admin-web dev   # React/Vite  → http://localhost:5173
pnpm --filter @cms/web dev     # Next.js     → http://localhost:3000
```

| Service       | URL                               |
|---------------|-----------------------------------|
| Admin API     | http://localhost:3001/api/v1      |
| Swagger UI    | http://localhost:3001/api/docs    |
| Admin Web     | http://localhost:5173             |
| Public Site   | http://localhost:3000             |

---

## Kiểm tra nhanh (PowerShell)

```powershell
# 1. Login — lấy access token
$response = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/login" `
  -Method POST -ContentType "application/json" `
  -Body '{"email":"admin@example.com","password":"Admin@123456"}'

$token = $response.data.accessToken

# 2. Danh sách pages
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/pages" `
  -Headers @{ Authorization = "Bearer $token" }

# 3. Chi tiết homepage (kèm blocks)
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/pages/homepage" `
  -Headers @{ Authorization = "Bearer $token" }

# 4. Tạo page mới
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/pages" `
  -Method POST `
  -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } `
  -Body '{"slug":"about-us","seoMeta":{"title":"About Us"}}'
```

Hoặc dùng **Swagger UI** tại http://localhost:3001/api/docs — click "Authorize", nhập `Bearer <token>`.

---

## Database schema

```
Roles ──< RolePermissions >── Permissions
  │
Users ──< PageVersions ──< Blocks
            │
Pages >─────┘ (published_version_id)

Media (standalone)
```

### Tại sao tách `pages` / `page_versions` / `blocks`

**Page versioning** cho phép editor làm việc trên bản DRAFT trong khi bản PUBLISHED vẫn chạy thật trên site. "Publish" chỉ là cập nhật con trỏ `pages.published_version_id` — không ghi đè dữ liệu đang live, rollback bất cứ lúc nào bằng cách đổi con trỏ.

**Blocks là bảng riêng** (không phải JSONB array trong page) để reorder an toàn không cần viết lại toàn bộ, query theo `type` được, và tránh row phình to vô hạn. Trường `data: jsonb` của từng block vẫn là JSON vì mỗi block type có shape khác nhau — schema validation diễn ra ở application layer bằng Zod (từ `block-registry`), không lặp lại ở tầng database.

---

## API Endpoints

### Auth

| Method | Path                       | Mô tả                                    |
|--------|----------------------------|------------------------------------------|
| POST   | `/api/v1/auth/login`       | Đăng nhập → `accessToken` + refresh cookie |
| POST   | `/api/v1/auth/refresh`     | Dùng cookie → access token mới           |
| POST   | `/api/v1/auth/logout`      | Revoke refresh token                     |
| GET    | `/api/v1/auth/me`          | Thông tin user hiện tại                  |

### Pages

| Method | Path                                                | Permission      |
|--------|-----------------------------------------------------|-----------------|
| GET    | `/api/v1/pages`                                     | authenticated   |
| GET    | `/api/v1/pages/:idOrSlug`                           | authenticated   |
| POST   | `/api/v1/pages`                                     | `page:create`   |
| PATCH  | `/api/v1/pages/:id`                                 | `page:update`   |
| DELETE | `/api/v1/pages/:id`                                 | `page:delete`   |
| POST   | `/api/v1/pages/:pageId/versions/:versionId/publish` | `page:publish`  |
| POST   | `/api/v1/pages/:pageId/versions/:versionId/draft`   | `page:update`   |

### Blocks (nested dưới page-version)

| Method | Path                                                    | Permission    |
|--------|---------------------------------------------------------|---------------|
| GET    | `/api/v1/page-versions/:versionId/blocks`               | authenticated |
| POST   | `/api/v1/page-versions/:versionId/blocks`               | `page:update` |
| PATCH  | `/api/v1/page-versions/:versionId/blocks/reorder`       | `page:update` |
| PATCH  | `/api/v1/page-versions/:versionId/blocks/:blockId`      | `page:update` |
| DELETE | `/api/v1/page-versions/:versionId/blocks/:blockId`      | `page:update` |

### Users

| Method | Path               | Permission    |
|--------|--------------------|---------------|
| GET    | `/api/v1/users`    | `user:read`   |
| GET    | `/api/v1/users/:id`| `user:read`   |
| POST   | `/api/v1/users`    | `user:create` |

---

## Block Registry

`packages/block-registry` là trung tâm của toàn hệ thống. Mỗi block có cấu trúc:

```
packages/block-registry/src/blocks/
└── hero/
    ├── schema.ts      # Zod schema — pure TS, NestJS import được
    ├── editor.tsx     # React form cho admin-web
    ├── renderer.tsx   # React component cho Next.js
    └── index.ts       # export BlockDefinition
```

`schema.ts` không import React hay bất kỳ dependency UI nào — đây là điều kiện để NestJS dùng được package mà không kéo theo React vào backend.

**Thêm block mới** chỉ cần:
1. Tạo thư mục `blocks/<tên-block>/` với `schema.ts`, `editor.tsx`, `renderer.tsx`, `index.ts`
2. Đăng ký vào `registry.ts` một dòng

Không cần sửa controller, không sửa route Next.js, không có `switch-case` rải rác theo `type`.

---

## Cấu trúc thư mục chi tiết

### admin-api (NestJS)

```
src/
├── modules/
│   ├── auth/          # JWT strategy, guards, refresh token rotation
│   ├── pages/         # CRUD pages + publish/draft workflow
│   ├── blocks/        # CRUD blocks + Zod validation từ block-registry
│   └── users/         # CRUD users
├── common/
│   ├── filters/       # HTTP exception filter — response envelope chuẩn
│   ├── interceptors/  # Response interceptor
│   └── pipes/         # ZodValidationPipe
└── prisma/            # PrismaService
```

### admin-web (React + Vite)

```
src/
├── api/               # typed fetch wrappers (auth, pages, blocks, page-versions)
├── components/        # UI components + layout (AppLayout, Sidebar, TopNav)
├── context/           # AuthContext
├── hooks/             # useAuth, usePages, useContentEntries
└── pages/
    ├── auth/          # LoginPage
    └── content-management/
        ├── ContentManagerPage.tsx    # danh sách page
        ├── PageEditPage.tsx          # page editor chính
        ├── BlockPickerModal.tsx      # chọn block từ registry
        └── components/
            ├── block-editors/        # HeroBlockEditor, FaqBlockEditor, RichTextBlockEditor...
            ├── BlockSectionCard.tsx
            └── CreatePageModal.tsx
```

### web (Next.js)

```
app/
├── [slug]/page.tsx      # catch-all cho mọi page động
├── api/revalidate/      # webhook revalidateTag khi admin publish
└── layout.tsx
components/
└── blocks/              # HeroBlock, FaqBlock, RichTextBlock...
lib/
└── pages.ts             # fetch page theo slug, typed
```

---

## Scripts database

```powershell
pnpm db:generate   # tạo Prisma Client từ schema
pnpm db:migrate    # tạo/migrate bảng trong database
pnpm db:seed       # seed roles, permissions, admin user, homepage mẫu
pnpm db:studio     # mở Prisma Studio tại http://localhost:5555
```

---

## Troubleshooting

### "Can't reach database server"

```powershell
# Kiểm tra PostgreSQL service (Windows)
Get-Service -Name postgresql*

# Kiểm tra port
Test-NetConnection -ComputerName localhost -Port 5432
```

### "P1001: Can't reach database" với Neon

Thêm `?sslmode=require` vào cuối connection string.

### "password authentication failed"

```powershell
psql -U postgres -c "\du"   # liệt kê users và roles
```

### Reset database hoàn toàn

```powershell
pnpm --filter admin-api prisma migrate reset
# Xác nhận → xoá hết data → chạy lại migrations → seed tự động
```