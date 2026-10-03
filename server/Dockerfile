# Acquisition API — Express + SQLite
FROM node:22-bookworm-slim

# better-sqlite3 falls back to a source build when no prebuild matches the platform.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY src ./src

ENV NODE_ENV=production PORT=4000 DATA_DIR=/data
RUN mkdir -p /data/uploads
VOLUME ["/data"]
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "fetch('http://127.0.0.1:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
