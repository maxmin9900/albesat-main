#!/bin/sh
set -e

# Production boot. Unlike the dev entrypoint this never installs packages and
# never runs the demo seed — the app is already built into the image, and the
# seed would delete a live catalogue.

echo "▶ Syncing database schema..."
# `db push` without --accept-data-loss stops on anything it thinks might lose
# data. Two of its "warnings" are not losses at all: adding a UNIQUE index
# ("will fail if duplicates exist" — Postgres ignores NULLs, and our new Bid
# columns are NULL on old rows) and adding an index. Accept those two kinds
# automatically; stop loudly for anything else (dropped column, type change).
if ! OUT=$(npx prisma db push --skip-generate 2>&1); then
  echo "$OUT"
  # every bullet line of the warning must be about a unique constraint / index
  BULLETS=$(printf '%s\n' "$OUT" | grep '^ *•' || true)
  OTHER=$(printf '%s\n' "$BULLETS" | grep -viE 'unique constraint|index' || true)
  if [ -n "$BULLETS" ] && [ -z "$OTHER" ]; then
    echo "▶ Only unique-constraint / index additions were flagged — applying."
    npx prisma db push --skip-generate --accept-data-loss
  else
    echo "✗ Schema sync stopped: the change above may lose data. Review it, then"
    echo "  run: docker compose -f docker-compose.prod.yml exec web npx prisma db push --accept-data-loss"
    exit 1
  fi
fi

echo "▶ Backfilling live-auction fields on legacy auctions (idempotent)..."
npx tsx scripts/backfill-auction-v2.ts || echo "backfill skipped (non-fatal)"

echo "▶ Ensuring the admin account exists..."
npx tsx prisma/ensure-admin.ts

echo "▶ Starting Next.js (production) on :3000 ..."
exec npm run start
