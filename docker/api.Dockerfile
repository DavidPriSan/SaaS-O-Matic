# syntax=docker/dockerfile:1
# API image: Fastify + SQLite, run with tsx (same runtime as `npm start`). Build context: repository root.

FROM node:26-slim AS build
WORKDIR /app
# Fallback toolchain in case no prebuilt better-sqlite3 binary matches this platform (it compiles from source).
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
# Manifests first: dependency layers stay cached while only source code changes.
COPY package.json package-lock.json .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# Only the API workspace (and @saas/shared through it): no React/Vite in this image.
RUN npm ci --workspace @saas/api
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api

FROM node:26-slim
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    DB_PATH=/data/saas-o-matic.db \
    PATH=/app/node_modules/.bin:$PATH
WORKDIR /app
COPY --from=build /app /app
# The named volume inherits this ownership on first use, so the unprivileged user can write the database.
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3000
HEALTHCHECK --interval=5s --timeout=3s --start-period=15s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
# Migrations run on boot; the seed only inserts sample data into an empty database. `exec` makes the server PID 1.
CMD ["sh", "-c", "tsx apps/api/src/db/seed.ts && exec tsx apps/api/src/server.ts"]
