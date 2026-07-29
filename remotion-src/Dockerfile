# Remotion Platform — Production Dockerfile

# Stage 1: Dependencies
FROM node:20-bookworm-slim AS deps

RUN apt-get update && apt-get install -y --no-install-recommends \
  ffmpeg \
  chromium \
  fonts-liberation \
  libnss3 libatk-bridge2.0-0 libcups2 libdrm2 \
  libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 \
  libgbm1 libasound2 \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

# Stage 2: Builder
FROM node:20-bookworm-slim AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build || true  # remotion bundles on render, not build

# Stage 3: Runtime
FROM node:20-bookworm-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
  ffmpeg \
  fonts-liberation \
  libnss3 libatk-bridge2.0-0 libcups2 libdrm2 \
  libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 \
  libgbm1 libasound2 \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# CRITICAL: do NOT set PUPPETEER_EXECUTABLE_PATH or use full google-chrome.
# Use Remotion's bundled chrome-headless-shell (no GPU process, no deadlock).
# See ~/.opencrabs/knowledge/BRAND/remotion-expert.md → Lesson A.

WORKDIR /app
COPY --from=builder /app /app

# Default render command (override in docker run)
ENV NODE_ENV=production
CMD ["npx", "remotion", "render", "src/index.ts", "PromoVideo", "out/video.mp4"]
