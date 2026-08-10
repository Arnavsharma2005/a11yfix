# Deployment Guide

This project is designed for a split deployment:

- Backend API on Railway or Render
- PostgreSQL managed by the backend host
- Redis managed by the backend host
- Frontend on Vercel

Other hosts work too, as long as they support Node.js, Postgres, Redis, and Puppeteer/Chromium.

## Backend

Recommended backend settings:

```txt
Root directory: apps/api
Build command: pnpm install --frozen-lockfile && pnpm --filter @a11yfix/api build
Start command: pnpm --filter @a11yfix/api start
Node version: 20
```

Required environment variables:

```txt
DATABASE_URL
REDIS_URL
PORT
WEB_URL
SESSION_SECRET
TOKEN_ENCRYPTION_KEY
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
MAX_PAGES_PER_SCAN
PAGE_TIMEOUT_MS
DEV_BYPASS_AUTH=false
RUN_WORKER_IN_API=true
```

For hosts that require Chromium without sandboxing:

```txt
PUPPETEER_NO_SANDBOX=true
```

## Database

Run migrations after the database is available:

```bash
pnpm --filter @a11yfix/api prisma:migrate
```

For production, prefer a deploy-safe migration command such as:

```bash
pnpm --filter @a11yfix/api prisma migrate deploy --schema src/db/prisma/schema.prisma
```

## Frontend

Recommended Vercel settings:

```txt
Root directory: apps/web
Build command: pnpm --filter @a11yfix/web build
Output directory: apps/web/dist
```

Set:

```txt
VITE_API_BASE_URL=https://your-api-host.example.com/api
```

If API and frontend are on different domains, configure CORS through:

```txt
WEB_URL=https://your-frontend-host.example.com
```

## GitHub OAuth

Create a GitHub OAuth App.

Homepage URL:

```txt
https://your-frontend-host.example.com
```

Authorization callback URL:

```txt
https://your-api-host.example.com/api/auth/github/callback
```

Set the generated client ID and secret in the backend environment.

## Production Checklist

- `DEV_BYPASS_AUTH=false`
- Strong `SESSION_SECRET`
- Valid 32-byte `TOKEN_ENCRYPTION_KEY`
- Postgres migrations applied
- Redis reachable
- `/api/health/deep` returns `ok: true`
- GitHub OAuth callback URL matches deployed API URL
- Frontend `VITE_API_BASE_URL` points to deployed API
