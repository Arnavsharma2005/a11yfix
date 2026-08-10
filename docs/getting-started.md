# Getting Started

This guide gets A11yFix running locally for development.

## Prerequisites

- Node.js 20 LTS or newer
- pnpm
- Docker Desktop
- Git

The app uses Docker Compose for local PostgreSQL and Redis. The API and web app run directly on your machine.

## Install Dependencies

From the repository root:

```bash
pnpm install
```

## Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

For local development, these defaults are enough to run the app without GitHub OAuth:

```txt
DEV_BYPASS_AUTH=true
RUN_WORKER_IN_API=true
DATABASE_URL="postgresql://a11yfix:a11yfix@localhost:5432/a11yfix?schema=public"
REDIS_URL="redis://localhost:6379"
```

Generate a real token encryption key before using GitHub OAuth:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Paste the generated value into:

```txt
TOKEN_ENCRYPTION_KEY="..."
```

## Start Services

Start PostgreSQL and Redis:

```bash
docker compose up -d
```

Generate the Prisma client and apply migrations:

```bash
pnpm prisma:generate
pnpm prisma:migrate
```

Start the API and frontend:

```bash
pnpm dev
```

Open:

```txt
http://localhost:5173
```

The API runs on:

```txt
http://localhost:4000
```

## Verify Health

Basic health:

```bash
curl http://localhost:4000/api/health
```

Deep health, including Postgres and Redis:

```bash
curl http://localhost:4000/api/health/deep
```

Expected successful response:

```json
{
  "ok": true,
  "checks": {
    "api": "ok",
    "database": "ok",
    "redis": "ok"
  }
}
```

## Common Problems

If scans fail to queue, Redis is probably not running. Run:

```bash
docker compose up -d redis
```

If database queries fail, confirm PostgreSQL is running:

```bash
docker compose ps
```

If Puppeteer fails to launch in a hosted Linux environment, set:

```txt
PUPPETEER_NO_SANDBOX=true
```

Use that only where the hosting platform requires it.
