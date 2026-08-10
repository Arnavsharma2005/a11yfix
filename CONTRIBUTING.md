# Contributing

Thanks for taking a look at A11yFix.

## Development Workflow

Install dependencies:

```bash
pnpm install
```

Start local services:

```bash
docker compose up -d
```

Run migrations:

```bash
pnpm prisma:generate
pnpm prisma:migrate
```

Start the app:

```bash
pnpm dev
```

## Checks Before Committing

Run:

```bash
pnpm typecheck
pnpm test
pnpm build
```

## Code Style

- Prefer strict TypeScript types over loose object shapes.
- Keep automated accessibility fixes conservative.
- Do not guess user-facing accessibility content.
- Add focused tests for prioritization and fix-generation logic.
- Keep API errors in the `{ error: { code, message } }` shape.

## Safety Rules

The crawler and fixer touch risky surfaces:

- User-submitted URLs
- Headless browser execution
- OAuth tokens
- GitHub repository writes

Do not weaken SSRF protections, token encryption, crawl limits, or PR batching without a clear reason.

## Pull Requests

Good PRs should include:

- What changed
- Why it changed
- How it was tested
- Any known limitations
