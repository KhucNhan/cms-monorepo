# DEPLOYMENT.md

> Deployment runbook for `cms-monorepo` on a fresh Linux server, domain mapped via Cloudflare
> Tunnel. Follow steps in order — later steps assume earlier ones completed successfully.
> Every gotcha below previously caused a real, hard-to-diagnose failure; do not skip them.

## 0. Server Prerequisites

Ubuntu/Debian with root or sudo. Install: `git`, `docker`, `nodejs` v20+, `pnpm@9.12.3`
(must match the version pinned in root `package.json`).

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

## 1. Database — PostgreSQL via Docker

```bash
docker run -d --name cms-postgres \
  -e POSTGRES_USER=cms_user \
  -e POSTGRES_PASSWORD=<strong-password> \
  -e POSTGRES_DB=cms_db \
  -p 5432:5432 \
  -v cms_pgdata:/var/lib/postgresql/data \
  --restart unless-stopped postgres:16
```

## 2. Clone

```bash
mkdir ~/cms-monorepo && cd ~/cms-monorepo
git clone https://github.com/KhucNhan/cms-monorepo.git .
```

⚠️ The trailing `.` is required — omitting it creates a nested duplicate-named directory.

## 3. Install Dependencies

```bash
pnpm install
```

**GOTCHA — verify before running `install`/`build`:**
- **Never set `NODE_ENV=production` before `install` or `build`.** pnpm will skip all
  `devDependencies` (`typescript`, `@nestjs/cli`, `prisma`, `ts-node`), causing
  `tsc: not found` / `prisma: not found` errors. Only set `NODE_ENV=production` when *running*
  the app via PM2 (Step 8), never during install/build. Check with `echo $NODE_ENV` — must be
  empty beforehand.
- If `admin-api` build fails with `Cannot find module 'sharp'` (native binding mismatch on a new
  architecture):
  ```bash
  pnpm --filter admin-api add sharp --force
  ```

## 4. Build Shared Packages (Order Is Mandatory)

```bash
pnpm --filter @cms/shared-types build
pnpm --filter @cms/block-registry build
```

`admin-api` imports `shared-types` from its compiled `dist/` output (not aliased to `src/` like
`admin-web`/`web` are). **Any future edit to `shared-types` requires rebuilding it before
`admin-api` will see the change.**

## 5. Environment Files

Not committed to git — create manually on every server.

**`apps/admin-api/.env`:**
```dotenv
DATABASE_URL="postgresql://cms_user:<password>@localhost:5432/cms_db?schema=public"
JWT_ACCESS_SECRET="<random — openssl rand -base64 32>"
JWT_REFRESH_SECRET="<random>"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
ADMIN_API_PORT=3001
NODE_ENV=production
WEB_URL="http://localhost:3000"
REVALIDATE_SECRET="<random>"
SEED_ADMIN_EMAIL="admin@example.com"
SEED_ADMIN_PASSWORD="<strong-password>"
COOKIE_SECRET="<random>"
CORS_ORIGIN=https://admin.khucnhan.io.vn,https://khucnhan.io.vn,https://www.khucnhan.io.vn
```
⚠️ `CORS_ORIGIN` values are comma-joined with **no spaces** — the code does a plain
`.split(',')`, so a stray space corrupts an origin string.

**`apps/web/.env`:**
```dotenv
API_URL=http://localhost:3001
REVALIDATE_SECRET=<must exactly match admin-api/.env>
```

**`apps/admin-web/.env.production`:**
```dotenv
VITE_API_URL=https://api.khucnhan.io.vn/api/v1
```
See Step 7 for why this is required.

## 6. Prisma: Generate, Migrate, Seed

```bash
pnpm --filter admin-api exec prisma generate
pnpm --filter admin-api build

cd apps/admin-api
env $(grep -v '^#' .env | xargs) pnpm exec prisma migrate deploy
env $(grep -v '^#' .env | xargs) pnpm exec ts-node prisma/seed.ts
cd ~/cms-monorepo
```

Use `env $(...) <command>` rather than `export $(...)` — this keeps env vars (especially
`NODE_ENV=production`) scoped to the single command instead of leaking into the shell session
(see Step 3 gotcha).

## 7. Production Build — All 3 Apps

```bash
pnpm --filter admin-api build
pnpm --filter @cms/admin-web build
pnpm --filter @cms/web build
```

**CRITICAL GOTCHA — Vite's `server.proxy` does NOT work in `preview` mode.**

`vite.config.ts` proxies `/api` → `localhost:3001`, but this config only applies to `vite dev`.
It has zero effect under `vite preview` (used to serve the production build). Since
`src/api/client.ts` calls the API with a relative path (`BASE_URL = '/api/v1'`), deploying across
subdomains (`admin.khucnhan.io.vn` served via `preview`) sends requests to the wrong domain → 404.

**Fix already applied** — `client.ts` reads the base URL from an env var:
```typescript
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1';
```
Paired with `.env.production` → `VITE_API_URL=https://api.khucnhan.io.vn/api/v1` (Step 5).
If the domain changes later, only that `.env.production` value needs updating — no code change.

**Secondary gotcha:** `Property 'env' does not exist on type 'ImportMeta'` means
`src/vite-env.d.ts` is missing `/// <reference types="vite/client" />` — add it.

## 8. Run via PM2

```bash
npm i -g pm2

pm2 start "pnpm start" --name cms-admin-api --cwd ~/cms-monorepo/apps/admin-api
pm2 start "pnpm preview -- --host 0.0.0.0 --port 4173" --name cms-admin-web --cwd ~/cms-monorepo/apps/admin-web
pm2 start "pnpm start" --name cms-web --cwd ~/cms-monorepo/apps/web

pm2 save
pm2 startup   # run the command it prints
```

⚠️ Vite preview defaults to port `4173` (not `5173`, which is the `dev` port). Confirm
`vite.config.ts` → `preview.port` matches both the PM2 command and the Cloudflare Tunnel
`config.yml`.

## 9. Domain + Cloudflare Tunnel

### Install `cloudflared`
```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
mv cloudflared /usr/local/bin/
cloudflared tunnel login
```

### Create tunnel
```bash
cloudflared tunnel create cms-tunnel
```

### `~/.cloudflared/config.yml`
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

⚠️ If this content was pasted from a source with auto-linking (chat app, Word), hostnames may get
mangled into markdown `[text](url)` form. Always `cat` the file after editing to confirm it's
plain text — this exact mistake previously caused silent misrouting that was hard to detect.

### Route DNS
```bash
cloudflared tunnel route dns cms-tunnel admin.khucnhan.io.vn
cloudflared tunnel route dns cms-tunnel api.khucnhan.io.vn
cloudflared tunnel route dns cms-tunnel khucnhan.io.vn
cloudflared tunnel route dns cms-tunnel www.khucnhan.io.vn
```
If root domain reports "record already exists": Cloudflare Dashboard → DNS → delete the old
A/AAAA/CNAME record for the root domain, then retry.

### Run
```bash
cloudflared tunnel run cms-tunnel
```
(Foreground for testing; move to a service per the TODO section below.)

⚠️ **Vite preview blocks unrecognized hosts** — add the domain explicitly:
```typescript
preview: {
  host: '0.0.0.0',
  port: 4173,
  allowedHosts: ['admin.khucnhan.io.vn'],
},
```
Without this: `Blocked request. This host is not allowed.`

## 10. CORS (Required — admin-web and admin-api on different subdomains)

`admin-api`'s `main.ts` reads allowed origins from `CORS_ORIGIN` (Step 5) but must also declare
`methods` explicitly, or `PATCH`/`DELETE` preflight requests get blocked even with a correct origin:

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

## 11. Git Push From Linux Server via VS Code Remote-SSH

If push fails with `Missing or invalid credentials` or
`ECONNREFUSED /run/user/0/vscode-git-*.sock`: VS Code's auto-set env vars (`GIT_ASKPASS`,
`VSCODE_GIT_IPC_HANDLE`, etc.) point to a socket that doesn't work over SSH. Fix:

```bash
unset GIT_ASKPASS VSCODE_GIT_ASKPASS_NODE VSCODE_GIT_ASKPASS_MAIN VSCODE_GIT_ASKPASS_EXTRA_ARGS VSCODE_GIT_IPC_HANDLE
git config --global credential.helper store
git push -u origin <branch>
```
Use a GitHub Personal Access Token (Settings → Developer settings → Tokens) as the password.

## 12. Post-Deploy Verification Checklist

```bash
pm2 status                                    # all 3 processes must show "online"
curl http://localhost:3001/api/v1/roles       # expect 401 (unauthenticated) — this is correct
curl http://localhost:4173                    # expect HTML from admin-web
curl http://localhost:3000                    # expect HTML from web

# Over public domain:
curl https://admin.khucnhan.io.vn
curl https://api.khucnhan.io.vn/api/v1/roles
curl https://khucnhan.io.vn
curl https://www.khucnhan.io.vn
```

## Open TODOs

- `cloudflared tunnel run` currently runs in a foreground test terminal — needs to become a
  **systemd service** (`cloudflared service install`) for auto-restart on reboot, mirroring
  `pm2 startup`.
- **Do not** run Prisma Studio (port 5555) as a persistent/public service via PM2 — it has no
  authentication. Only run it temporarily for debugging, or access it through a dedicated SSH
  tunnel (`ssh -L 5555:localhost:5555 ...`). Do not add it to Cloudflare Tunnel `config.yml`.
  
## 13. CI/CD (từ 2026-07)

Deploy giờ tự động qua GitHub Actions (`.github/workflows/ci-cd.yml`) mỗi khi push
vào `master`: test → build → SSH qua Netbird → chạy `deploy.sh` trên server → PM2 restart.

KHÔNG cần lặp lại các bước thủ công Section 1-8 nữa trừ khi:
- Bootstrap server hoàn toàn mới (chưa từng cài Netbird/PM2/`deploy.sh`)
- Debug deploy.sh trực tiếp (`bash ~/cms-monorepo/deploy.sh`) khi CI fail

Gotcha quan trọng đã gặp: `deploy.sh` tự `git reset --hard` chính file đang thực thi
(self-modifying script) — script phải `exec bash "$0"` sau khi pull để tránh chạy
nhầm nội dung cũ đã nạp vào bộ nhớ trước đó. Không xoá đoạn re-exec này khi sửa file.