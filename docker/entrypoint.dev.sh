#!/bin/sh
set -e

echo "▶ Installing dependencies (if needed)..."
if [ ! -d "node_modules/next" ]; then
  npm install --no-audit --no-fund
fi

echo "▶ Generating Prisma client..."
npx prisma generate

echo "▶ Syncing database schema..."
npx prisma db push --skip-generate --accept-data-loss

echo "▶ Seeding database (idempotent)..."
npm run db:seed || echo "seed skipped/failed (non-fatal)"

echo "▶ Starting Next.js dev server on :3000 ..."
exec npm run dev
