# ---------- base ----------
FROM node:20-slim AS base
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---------- deps ----------
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# ---------- dev ----------
# In dev, node_modules live in a named volume and are installed by the
# entrypoint on first boot, so we don't bake them into the image.
FROM base AS dev
COPY . .
EXPOSE 3000
CMD ["sh", "-c", "sed -i 's/\\r$//' /app/docker/entrypoint.dev.sh; chmod +x /app/docker/entrypoint.dev.sh; sh /app/docker/entrypoint.dev.sh"]

# ---------- builder (prod) ----------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---------- runner (prod) ----------
FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
# the boot script (schema sync + admin check) and the one-off maintenance
# scripts referenced in DEPLOY.md
COPY --from=builder /app/docker ./docker
COPY --from=builder /app/scripts ./scripts
# The repo is edited on Windows; a CRLF shell script makes `sh` die with
# "set: Illegal option -". Normalise here so the image never depends on the
# checkout's line endings.
RUN sed -i 's/\r$//' /app/docker/*.sh && chmod +x /app/docker/*.sh
EXPOSE 3000
CMD ["sh", "/app/docker/entrypoint.prod.sh"]
