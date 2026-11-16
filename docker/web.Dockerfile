# syntax=docker/dockerfile:1
# Web image: production Vite build served by nginx, which also proxies /api to the API container
# (same contract as the Vite dev proxy, ADR-006). Build context: repository root.

FROM node:26-slim AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# The root workspace provides the build toolchain (typescript, vite).
RUN npm ci --workspace @saas/web --include-workspace-root
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build --workspace @saas/web

FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=5s --timeout=3s --retries=5 CMD wget -q --spider http://127.0.0.1/ || exit 1
