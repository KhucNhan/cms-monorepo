# DEPLOYMENT.md

> Runbook triển khai `cms-monorepo` lên server Linux trống, map domain qua Cloudflare Tunnel.
> Đọc file này khi setup server mới — không lặp lại quy trình dò lỗi thủ công như lần đầu.

## 0. Yêu cầu server

- Ubuntu/Debian, quyền root hoặc sudo
- Cài mới: `git`, `docker`, `nodejs` (v20+), `pnpm@9.12.3` (đúng version pin trong `package.json` root)

```bash
apt update && apt upgrade -y
apt install -y curl git build-essential
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
corepack enable
corepack prepare pnpm@9.12.3 --activate
```

## 1. Database — PostgreSQL qua Docker

```bash
docker run -d --name cms-postgres \
  -e POSTGRES_USER=cms_user \
  -e POSTGRES_PASSWORD=<mật khẩu mạnh> \
  -e POSTGRES_DB=cms_db \
  -p 5432:5432 \
  -v cms_pgdata:/var/lib/postgresql/data \
  --restart unless-stopped postgres:16
```

## 2. Clone code

```bash
mkdir ~/cms-monorepo && cd ~/cms-monorepo
git clone https://github.com/KhucNhan/cms-monorepo.git .
```
Lưu ý dấu `.` cuối lệnh clone — thiếu sẽ lồng thêm 1 thư mục con trùng tên.

## 3. Cài dependencies

```bash
pnpm install
```

**Gotcha — đọc kỹ trước khi chạy:**
- **KHÔNG được set `NODE_ENV=production` trong shell trước khi `install`/`build`.** pnpm sẽ tự skip toàn bộ `devDependencies` (thiếu `typescript`, `@nestjs/cli`, `prisma`, `ts-node`...), gây lỗi `tsc: not found` / `prisma: not found`. Chỉ set `NODE_ENV=production` lúc **chạy** app qua PM2, không phải lúc cài/build. Kiểm tra bằng `echo $NODE_ENV` — phải rỗng trước khi install/build.
- Nếu `sharp` báo lỗi `Cannot find module 'sharp'` khi build `admin-api` (thường do native binding chưa build đúng arch trên server mới):
```bash
  pnpm --filter admin-api add sharp --force
```

## 4. Build packages dùng chung (bắt buộc đúng thứ tự)

```bash
pnpm --filter @cms/shared-types build
pnpm --filter @cms/block-registry build
```
`admin-api` import `shared-types` qua `dist/` (không alias `src/` như `admin-web`/`web`) — nếu sửa `shared-types` sau này, luôn build lại trước khi build `admin-api`.

## 5. Cấu hình `.env` (không có trong git, tạo tay mỗi server)

**`apps/admin-api/.env`:**
```dotenv
DATABASE_URL="postgresql://cms_user:<mật khẩu>@localhost:5432/cms_db?schema=public"
JWT_ACCESS_SECRET="<random — openssl rand -base64 32>"
JWT_REFRESH_SECRET="<random>"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
ADMIN_API_PORT=3001
NODE_ENV=production
WEB_URL="http://localhost:3000"
REVALIDATE_SECRET="<random>"
SEED_ADMIN_EMAIL="admin@example.com"
SEED_ADMIN_PASSWORD="<mật khẩu mạnh>"
COOKIE_SECRET="<random>"
CORS_ORIGIN=https://admin.khucnhan.io.vn,https://khucnhan.io.vn,https://www.khucnhan.io.vn
```
Lưu ý: `CORS_ORIGIN` nối bằng dấu phẩy, **không có khoảng trắng** (code dùng `.split(',')` đơn giản, khoảng trắng sẽ làm sai origin string).

**`apps/web/.env`:**
```dotenv
API_URL=http://localhost:3001
REVALIDATE_SECRET=<phải khớp chính xác với admin-api/.env>
```

**`apps/admin-web/.env.production`:**
```dotenv
VITE_API_URL=https://api.khucnhan.io.vn/api/v1
```
Xem gotcha ở mục 7 để hiểu vì sao cần biến này.

## 6. Prisma: generate, migrate, seed

```bash
pnpm --filter admin-api exec prisma generate
pnpm --filter admin-api build

cd apps/admin-api
env $(grep -v '^#' .env | xargs) pnpm exec prisma migrate deploy
env $(grep -v '^#' .env | xargs) pnpm exec ts-node prisma/seed.ts
cd ~/cms-monorepo
```
Dùng `env $(...) <lệnh>` thay vì `export $(...)` để biến môi trường (đặc biệt `NODE_ENV=production`) không dính lại vào session, tránh lặp lại gotcha ở mục 3.

## 7. Build production cả 3 app

```bash
pnpm --filter admin-api build
pnpm --filter @cms/admin-web build
pnpm --filter @cms/web build
```

**Gotcha quan trọng nhất — Vite `proxy` KHÔNG hoạt động ở `preview` mode:**
`vite.config.ts` có cấu hình `server.proxy` chuyển tiếp `/api` → `localhost:3001`, nhưng cấu hình này **chỉ áp dụng khi chạy `vite dev`**, hoàn toàn không có tác dụng khi chạy `vite preview` (dùng để serve production build, đây là cách deploy thật). Vì `src/api/client.ts` gọi API bằng đường dẫn tương đối (`BASE_URL = '/api/v1'`), khi deploy qua domain (`admin.khucnhan.io.vn`, chạy bằng `preview`) mọi request sẽ gọi nhầm vào chính domain đó thay vì `api.khucnhan.io.vn` → 404.

Đã sửa bằng cách đổi `BASE_URL` trong `client.ts` đọc từ biến môi trường:
```typescript
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1';
```
Và thêm `.env.production` với `VITE_API_URL=https://api.khucnhan.io.vn/api/v1` (xem mục 5). Nếu domain đổi sau này, chỉ cần sửa file `.env.production` này, không cần sửa code.

**Gotcha khác — thiếu type cho `import.meta.env`:** nếu gặp lỗi `Property 'env' does not exist on type 'ImportMeta'`, kiểm tra `src/vite-env.d.ts` có dòng `/// <reference types="vite/client" />` chưa.

## 8. Chạy nền bằng PM2

```bash
npm i -g pm2

pm2 start "pnpm start" --name cms-admin-api --cwd ~/cms-monorepo/apps/admin-api
pm2 start "pnpm preview -- --host 0.0.0.0 --port 4173" --name cms-admin-web --cwd ~/cms-monorepo/apps/admin-web
pm2 start "pnpm start" --name cms-web --cwd ~/cms-monorepo/apps/web

pm2 save
pm2 startup   # copy và chạy dòng lệnh nó in ra
```

**Lưu ý:** Vite preview mặc định chạy port `4173` (không phải `5173` — đó là port của `dev`). Đảm bảo `vite.config.ts` → `preview.port` khớp với port dùng trong lệnh PM2 và trong `config.yml` Cloudflare Tunnel.

## 9. Domain + Cloudflare Tunnel

### Cài `cloudflared`
```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
mv cloudflared /usr/local/bin/
cloudflared tunnel login
```

### Tạo tunnel
```bash
cloudflared tunnel create cms-tunnel
```

### Cấu hình `~/.cloudflared/config.yml`
```yaml
tunnel: <TUNNEL_ID>
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: admin.khucnhan.io.vn
    service: http://localhost:4173
  - hostname: api.khucnhan.io.vn
    service: http://localhost:3001
  - hostname: khucnhan.io.vn
    service: http://localhost:3000
  - hostname: www.khucnhan.io.vn
    service: http://localhost:3000
  - service: http_status:404
```

**Gotcha:** nếu paste nội dung từ nơi có auto-link (chat app, Word...), URL/hostname có thể bị dính markdown dạng `[text](url)`. Luôn `cat` lại file sau khi sửa để xác nhận nội dung thuần text, không dính ký tự lạ — lỗi này từng gây route sai domain im lặng, khó phát hiện.

### Route DNS cho từng subdomain
```bash
cloudflared tunnel route dns cms-tunnel admin.khucnhan.io.vn
cloudflared tunnel route dns cms-tunnel api.khucnhan.io.vn
cloudflared tunnel route dns cms-tunnel khucnhan.io.vn
cloudflared tunnel route dns cms-tunnel www.khucnhan.io.vn
```
Nếu root domain báo lỗi "record already exists", vào Cloudflare Dashboard → DNS → xoá A/AAAA/CNAME record cũ trỏ tới root domain trước khi route lại.

### Chạy tunnel (test foreground trước, sau đó nên chuyển sang service)
```bash
cloudflared tunnel run cms-tunnel
```

**Gotcha — Vite preview chặn host lạ:** thêm domain vào `vite.config.ts`:
```typescript
preview: {
  host: '0.0.0.0',
  port: 4173,
  allowedHosts: ['admin.khucnhan.io.vn'],
},
```
Nếu không, gặp lỗi "Blocked request. This host is not allowed."

## 10. CORS — bắt buộc khi admin-web và admin-api khác subdomain

`main.ts` của `admin-api` đọc origin từ env `CORS_ORIGIN` (xem mục 5), nhưng cần khai báo tường minh `methods`, nếu không preflight `PATCH`/`DELETE` có thể bị chặn dù origin đã đúng:

```typescript
app.enableCors({
  origin: process.env['CORS_ORIGIN']?.split(',') ?? [
    'http://localhost:5173',
    'http://localhost:5175',
  ],
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

## 11. Git push từ server Linux qua VS Code Remote-SSH

Nếu gặp lỗi `Missing or invalid credentials` / `ECONNREFUSED /run/user/0/vscode-git-*.sock` khi push — nguyên nhân là biến môi trường VS Code tự set (`GIT_ASKPASS`, `VSCODE_GIT_IPC_HANDLE`...) trỏ vào socket không hoạt động được trong ngữ cảnh SSH server. Sửa:
```bash
unset GIT_ASKPASS VSCODE_GIT_ASKPASS_NODE VSCODE_GIT_ASKPASS_MAIN VSCODE_GIT_ASKPASS_EXTRA_ARGS VSCODE_GIT_IPC_HANDLE
git config --global credential.helper store
git push -u origin <branch>
```
Dùng Personal Access Token (GitHub → Settings → Developer settings → Tokens) làm password khi được hỏi.

## 12. Checklist kiểm tra sau khi deploy xong

```bash
pm2 status                                    # cả 3 process phải online
curl http://localhost:3001/api/v1/roles       # kỳ vọng 401 (chưa auth) — đúng
curl http://localhost:4173                    # HTML admin-web
curl http://localhost:3000                    # HTML web

# Qua domain public:
curl https://admin.khucnhan.io.vn
curl https://api.khucnhan.io.vn/api/v1/roles
curl https://khucnhan.io.vn
curl https://www.khucnhan.io.vn
```

## TODO — chưa hoàn thiện

- `cloudflared tunnel run` hiện chạy foreground trong terminal test — cần chuyển sang chạy dạng **systemd service** để tự khởi động lại khi server reboot (`cloudflared service install`), tương tự PM2 startup.
- Prisma Studio (port 5555) **không nên** chạy nền qua PM2/public — không có auth. Chỉ chạy tạm khi debug, hoặc truy cập qua SSH tunnel riêng (`ssh -L 5555:localhost:5555 ...`), không thêm vào `config.yml` Cloudflare Tunnel.