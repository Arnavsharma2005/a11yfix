# A11yFix

A11yFix is an accessibility audit-as-a-service project. It crawls a public website, runs real WCAG 2.1 AA checks with axe-core in Puppeteer, ranks violations by real-world user impact, and generates conservative code-level fixes for safe rule types.

The project is designed as a portfolio-grade full-stack system: React frontend, Express API, Redis-backed jobs, PostgreSQL persistence, Puppeteer scanning, and optional GitHub pull request automation.

## Documentation

- [Getting Started](docs/getting-started.md)
- [Architecture](docs/architecture.md)
- [API Reference](docs/api-reference.md)
- [Scanning and Prioritization](docs/scanning-and-prioritization.md)
- [Fix Generation](docs/fix-generation.md)
- [Security Notes](docs/security.md)
- [Deployment Guide](docs/deployment.md)
- [Project Roadmap](docs/roadmap.md)

## What is implemented

- pnpm workspace monorepo with `apps/api`, `apps/web`, and `packages/shared-types`.
- Express 4 API with the exact scan/site/auth route family from the spec.
- PostgreSQL data model in Prisma, including `Site`, `Scan`, `Violation`, `User`, and stored raw scanned pages for fix generation.
- BullMQ Redis-backed scan jobs.
- Puppeteer crawler capped by page count and timeout.
- axe-core scanning via `@axe-core/puppeteer`.
- Priority scoring from the spec:

```txt
priorityScore = round(
  (impactWeight * 0.4) +
  (pageWeight * 0.3) +
  (elementWeight * 0.2) +
  (frequencyWeight * 0.1)
)
```

- Safe fix generation for `image-alt`, `label`, `link-name`, `button-name`, and `html-has-lang`.
- Suggest-only color contrast remediation with computed foreground color suggestions.
- AES-256-GCM encryption helper for GitHub OAuth tokens.
- URL safety validation to block localhost, private IPs, link-local addresses, and metadata IPs before crawling.
- Rate limiting on scan creation: 5 scans per hour per user.
- React 18 + Vite frontend with Dashboard, New Scan, and Scan Detail pages.

The GitHub PR service is intentionally conservative: it opens PRs only after fixes have been generated, splits fixes into PRs of at most 15 violations, and edits static HTML source files only when a unique confident source match is found. Ambiguous or JSX source matches are skipped instead of guessed.

## Local setup

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm prisma:generate
pnpm prisma:migrate
pnpm dev
```

The web app runs at `http://localhost:5173`; the API runs at `http://localhost:4000`.

Use `GET /api/health/deep` to confirm that the API, Postgres, and Redis are all reachable before starting a scan.

For local development, `DEV_BYPASS_AUTH=true` creates a local dev user automatically. For GitHub OAuth and PR creation, set:

```txt
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
TOKEN_ENCRYPTION_KEY
```

Generate a valid encryption key with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## API

```txt
POST   /api/sites
GET    /api/sites
POST   /api/sites/:siteId/scans
GET    /api/scans/:scanId
GET    /api/scans/:scanId/status
POST   /api/scans/:scanId/violations/:violationId/generate-fix
POST   /api/sites/:siteId/github-connect
POST   /api/scans/:scanId/open-pr
GET    /api/auth/github
GET    /api/auth/github/callback
```

Errors use:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

## Tests

```bash
pnpm test
pnpm typecheck
pnpm build
```

Current focused tests cover the prioritization algorithm and rule-to-fix generation.

## Repository Layout

```txt
apps/api                 Express API, Prisma schema, scanner, queue worker
apps/web                 React/Vite frontend
packages/shared-types    Shared TypeScript API/domain types
docs                     Project documentation
docker-compose.yml       Local Postgres and Redis services
```

## Current Limitations

- The GitHub PR automation currently applies confident static HTML source fixes. JSX/TSX AST edits are described in the design but intentionally skipped unless a safe source match exists.
- Docker, Postgres, and Redis are required for the full scan pipeline.
- Color contrast fixes are suggestions only because brand color changes should be reviewed by a human.
