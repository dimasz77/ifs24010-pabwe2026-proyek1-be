# ---------- Tahap 1: dependency (better-sqlite3 butuh toolchain bila tidak ada prebuilt) ----------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package*.json .npmrc ./
RUN npm ci --omit=dev

# ---------- Tahap 2: image runtime ----------
FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    PORT=4000 \
    DB_PATH=/data/rental.db \
    AUTO_SEED=true
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY scripts ./scripts
RUN mkdir -p /data && chown -R node:node /data /app
USER node
VOLUME ["/data"]
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/server.js"]
