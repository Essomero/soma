# Soma — single-image Docker (Vite SPA + Node API)
# No Turso required: local SQLite file ./data/soma.db by default
# With TURSO_DATABASE_URL + TURSO_AUTH_TOKEN: switches to remote automatically
# Works on Fly.io, Railway, Render, Coolify, self-hosted
# - Railway: volume /app/data mounted as root, needs root to chown/chmod
# - Fly/Render/Docker Compose: volume mounts /data or /app/data

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Build SPA only — no DB in build step. Validates content, generates sitemap, builds.
RUN npx tsx scripts/validate-content.ts && \
    npx tsx scripts/generate-sitemap.ts && \
    npx tsc -b && \
    npx vite build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/api ./api
COPY --from=build /app/server ./server
# Keep src/content for init-docker auto-seed on first boot (files alone = stories on :3000)
COPY --from=build /app/src/content ./src/content
COPY --from=build /app/src/types ./src/types
COPY --from=build /app/scripts ./scripts
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh && mkdir -p /app/data && chown -R node:node /app
# No USER directive — entrypoint runs as root to fix volume perms (Railway mounts as root)
# Server will run as root inside container (isolated via container boundary)
# Other platforms: Compose still has soma_data:/app/data, Fly [[mounts]] /data, Render Disks /app/data
EXPOSE 3000
ENV SQLITE_PATH=/app/data/soma.db
ENV USE_TURSO=false
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server/index.mjs"]
