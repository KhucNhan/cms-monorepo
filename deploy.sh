#!/usr/bin/env bash
# deploy.sh — lives on the server at ~/cms-monorepo/deploy.sh
# Triggered by GitHub Actions over SSH (via Netbird) after tests pass on main.
# Mirrors the manual steps in DEPLOYMENT.md — keep both in sync if you change one.

set -euo pipefail

# ── Bước 1: Pull code mới, rồi RE-EXEC chính mình ──────────────────────────
# Quan trọng: bash đọc file này vào lúc bắt đầu chạy — nếu `git reset` bên dưới
# ghi đè chính file đang thực thi, các dòng lệnh còn lại vẫn chạy theo nội dung
# CŨ (fd cũ trỏ vào inode cũ). Để tránh "self-modifying script" gotcha này,
# script chỉ pull code rồi tự re-exec (`exec bash "$0"`) để bash đọc lại từ đầu,
# đảm bảo phần build/deploy phía dưới luôn chạy đúng bản mới nhất vừa pull về.
if [ "${DEPLOY_REEXECED:-}" != "1" ]; then
  cd ~/cms-monorepo
  echo "==> Pulling latest master"
  git fetch origin
  git reset --hard origin/master

  # `git reset --hard` does NOT remove untracked files. tsconfig.tsbuildinfo
  # is gitignored (build cache), so it survives across deploys on the server
  # and can hold a stale fingerprint from a previous tsconfig.json (rootDir,
  # exclude, etc.) — tsc then thinks dist/main.js is already up-to-date and
  # silently skips emitting it (no error, no output). Always start clean.
  echo "==> Cleaning stale incremental build caches (untracked, not removed by reset --hard)"
  rm -f apps/admin-api/tsconfig.tsbuildinfo
  rm -rf apps/admin-api/dist

  export DEPLOY_REEXECED=1
  exec bash "$0"
fi

# ── Từ đây trở xuống luôn chạy trên bản deploy.sh mới nhất vừa pull ────────

# SSH non-interactive shell (GitHub Actions gọi vào) không tự load ~/.bashrc,
# nên PATH thiếu pnpm/node do nvm quản lý. Thêm tường minh path thật của server.
export PATH="/root/.nvm/versions/node/v22.18.0/bin:$PATH"

cd ~/cms-monorepo

echo "==> Installing dependencies"
# NEVER set NODE_ENV=production before install/build — pnpm would skip devDependencies
# (typescript, @nestjs/cli, prisma, ts-node) and builds would fail. See DEPLOYMENT.md Step 3.
unset NODE_ENV
pnpm install

echo "==> Building shared packages (order is mandatory)"
pnpm --filter @cms/shared-types build
pnpm --filter @cms/block-registry build

echo "==> Prisma generate + migrate + build admin-api"
pnpm --filter admin-api exec prisma generate
pnpm --filter admin-api build
(
  cd apps/admin-api
  env $(grep -v '^#' .env | xargs) pnpm exec prisma migrate deploy
  echo "==> Re-seeding permissions/roles (idempotent upsert, safe to re-run)"
  env $(grep -v '^#' .env | xargs) pnpm exec ts-node prisma/seed.ts
)

echo "==> Building admin-web and web"
pnpm --filter @cms/admin-web build
pnpm --filter @cms/web build

echo "==> Restarting services via PM2"
pm2 restart cms-admin-api cms-admin-web cms-web

echo "==> Deploy finished"
pm2 status