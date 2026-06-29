# CMS Monorepo — Phase 1

> NestJS + PostgreSQL · pnpm workspaces · Turborepo

---

## Yêu cầu

| Tool | Version | Link |
|------|---------|------|
| Node.js | ≥ 20 | https://nodejs.org |
| pnpm | ≥ 9 | `npm i -g pnpm` |
| PostgreSQL | ≥ 15 | xem hướng dẫn bên dưới |

---

## Bước 1 — Cài PostgreSQL (không dùng Docker)

Chọn **một** trong ba cách:

### Cách A — Neon (cloud, không cài gì — khuyến nghị để bắt đầu nhanh)

1. Vào https://neon.tech → Sign up miễn phí
2. Tạo project → copy **Connection string** dạng:
   ```
   postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. Dán vào `DATABASE_URL` trong file `.env`

### Cách B — PostgreSQL local trên Windows (winget)

Mở **PowerShell** với quyền Administrator:

```powershell
# Cài PostgreSQL 16
winget install PostgreSQL.PostgreSQL.16

# Sau khi cài xong, thêm vào PATH (nếu chưa tự động)
$env:Path += ";C:\Program Files\PostgreSQL\16\bin"

# Tạo database
psql -U postgres -c "CREATE USER cms_user WITH PASSWORD 'cms_pass';"
psql -U postgres -c "CREATE DATABASE cms_db OWNER cms_user;"
```

`DATABASE_URL` sẽ là:
```
postgresql://cms_user:cms_pass@localhost:5432/cms_db?schema=public
```

### Cách C — PostgreSQL local qua Laragon (GUI, dễ nhất trên Windows)

1. Tải Laragon Full tại https://laragon.org/download
2. Start All → PostgreSQL đã chạy ở cổng 5432 (user: `root`, pass: rỗng)
3. Vào menu Laragon → Database → HeidiSQL để tạo database `cms_db`

`DATABASE_URL` sẽ là:
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
# PowerShell
Copy-Item .env.example apps\admin-api\.env
```

Mở `apps\admin-api\.env` và điền `DATABASE_URL` từ Bước 1.

Đổi hai JWT secrets thành chuỗi ngẫu nhiên (≥ 32 ký tự):

```powershell
# PowerShell — tạo secret ngẫu nhiên
[System.Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Max 256) }))
```

---

## Bước 4 — Migrate & Seed

```powershell
# Tạo Prisma Client từ schema
pnpm db:generate

# Tạo bảng trong database (nhập tên migration khi được hỏi, ví dụ: "init")
pnpm db:migrate

# Tạo roles, permissions, admin user, homepage mẫu
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

## Bước 5 — Chạy server

```powershell
pnpm --filter admin-api dev
```

```
🚀 Admin API running on http://localhost:3001/api/v1
📖 Swagger docs: http://localhost:3001/api/docs
```

---

## Kiểm tra nhanh

Mở PowerShell hoặc terminal VSCode:

```powershell
# 1. Login — lấy access token
$response = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"admin@example.com","password":"Admin@123456"}'

$token = $response.data.accessToken
Write-Host "Token: $token"

# 2. Lấy danh sách pages
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/pages" `
  -Headers @{ Authorization = "Bearer $token" }

# 3. Xem homepage với blocks
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

### Điểm khác biệt so với JSON-array permissions

| | JSON array (cũ) | Normalized table (hiện tại) |
|---|---|---|
| Thêm permission mới | Sửa code | INSERT vào DB |
| Query "role nào có quyền X" | Không thể | `SELECT` bình thường |
| Revoke một permission cụ thể | Phải parse JSON | `DELETE` một dòng |
| Đồng bộ trong JWT | Flatten sang string[] | Flatten sang `"resource:action"[]` |

---

## API Endpoints

### Auth
| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/api/v1/auth/login` | Login → `{ data: { accessToken } }` + refresh cookie |
| POST | `/api/v1/auth/refresh` | Dùng cookie → access token mới |
| POST | `/api/v1/auth/logout` | Revoke refresh token |
| POST | `/api/v1/auth/me` | Thông tin user hiện tại |

### Pages
| Method | Path | Permission |
|--------|------|-----------|
| GET | `/api/v1/pages` | authenticated |
| GET | `/api/v1/pages/:idOrSlug` | authenticated |
| POST | `/api/v1/pages` | `page:create` |
| PATCH | `/api/v1/pages/:id` | `page:update` |
| DELETE | `/api/v1/pages/:id` | `page:delete` |
| POST | `/api/v1/pages/:pageId/versions/:versionId/publish` | `page:publish` |
| POST | `/api/v1/pages/:pageId/versions/:versionId/draft` | `page:update` |

### Blocks (nested dưới page-version)
| Method | Path | Permission |
|--------|------|-----------|
| GET | `/api/v1/page-versions/:versionId/blocks` | authenticated |
| POST | `/api/v1/page-versions/:versionId/blocks` | `page:update` |
| PATCH | `/api/v1/page-versions/:versionId/blocks/reorder` | `page:update` |
| PATCH | `/api/v1/page-versions/:versionId/blocks/:blockId` | `page:update` |
| DELETE | `/api/v1/page-versions/:versionId/blocks/:blockId` | `page:update` |

### Users
| Method | Path | Permission |
|--------|------|-----------|
| GET | `/api/v1/users` | `user:read` |
| GET | `/api/v1/users/:id` | `user:read` |
| POST | `/api/v1/users` | `user:create` |

---

## Debug tools

```powershell
# Prisma Studio — GUI xem/sửa database
pnpm db:studio
# → http://localhost:5555
```

---

## Troubleshooting

### Lỗi "Can't reach database server"
Kiểm tra PostgreSQL đang chạy:
```powershell
# Windows Service
Get-Service -Name postgresql*

# Hoặc kiểm tra port
Test-NetConnection -ComputerName localhost -Port 5432
```

### Lỗi "P1001: Can't reach database" với Neon
Thêm `?sslmode=require` vào cuối connection string.

### Lỗi "password authentication failed"
Kiểm tra lại user/password trong `DATABASE_URL`. Với Windows local:
```powershell
psql -U postgres -c "\du"   # liệt kê users
```

### Reset database hoàn toàn
```powershell
pnpm --filter admin-api prisma migrate reset
# Xác nhận → xoá hết data → chạy lại migrations → seed tự động
```
