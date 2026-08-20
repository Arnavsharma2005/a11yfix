# Base stage with Node 20 and pnpm
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Install Chromium system dependencies for Puppeteer headless scanner
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Build stage
FROM base AS builder
COPY . .
RUN pnpm install --no-frozen-lockfile
RUN pnpm prisma:generate
RUN pnpm --filter @a11yfix/shared-types build
RUN pnpm --filter @a11yfix/api build

# Production runner stage
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app /app

EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy --schema apps/api/src/db/prisma/schema.prisma && pnpm --filter @a11yfix/api start"]
