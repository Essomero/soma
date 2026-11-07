# Soma — single-image Docker (Vite SPA + Node API)
# No Turso required: local SQLite file ./data/soma.db by default
# With TURSO_DATABASE_URL + TURSO_AUTH_TOKEN: switches to remote automatically
# Works on Fly.io, Railway, Render, Coolify, self-hosted

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
USER node
EXPOSE 3000
ENV SQLITE_PATH=/app/data/soma.db
ENV USE_TURSO=false
# Entrypoint seeds file SQLite via volume if empty (/app/data/soma.db), then starts server
# Note: No VOLUME directive here — Railway rejects Dockerfile VOLUME. Use platform
# Volumes/Disk mount at /app/data instead (Railway dashboard Add Volume, Render Disk,
# Fly mounts, Docker Compose volume). Compose still has soma_data:/app/data.
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server/index.mjs"]
