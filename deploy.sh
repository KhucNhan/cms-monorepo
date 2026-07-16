#!/usr/bin/env bash
# deploy.sh — lives on the server at ~/cms-monorepo/deploy.sh
# Triggered by GitHub Actions over SSH (via Netbird) after tests pass on main.
# Mirrors the manual steps in DEPLOYMENT.md — keep both in sync if you change one.

set -euo pipefail
cd ~/cms-monorepo

echo "==> Pulling latest master"
git fetch origin
git reset --hard origin/master

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
)

echo "==> Building admin-web and web"
pnpm --filter @cms/admin-web build
pnpm --filter @cms/web build

echo "==> Restarting services via PM2"
pm2 restart cms-admin-api cms-admin-web cms-web

echo "==> Deploy finished"
pm2 status