# Project Roadmap

This roadmap keeps the project aligned with the original portfolio goal: a credible accessibility remediation product, not just an axe-core wrapper.

## Phase 1: Core Scan Pipeline

Status: mostly implemented.

- Crawl same-origin pages
- Run axe-core in Puppeteer
- Store violations
- Compute priority score
- Display sorted results

Remaining improvements:

- Add E2E test fixtures for crawler behavior
- Add richer scan failure details
- Add per-page scan logs

## Phase 2: Fix Generation

Status: implemented for the first safe rules.

Implemented:

- `image-alt`
- `label`
- `link-name`
- `button-name`
- `html-has-lang`
- `color-contrast` suggestions

Next:

- Add more fixtures from real scanned pages
- Improve source matching for static sites
- Add JSX/TSX AST edit support for React repos

## Phase 3: Auth and Multi-user

Status: partially implemented.

Implemented:

- GitHub OAuth route structure
- Session-based auth
- Local dev bypass user
- Encrypted token helper
- Site ownership scoping

Next:

- Add persistent production session store
- Add logout route
- Add user profile UI

## Phase 4: GitHub PR Automation

Status: conservative implementation exists.

Implemented:

- Connect site to `owner/repo`
- Use generated fixes only
- Cap PRs at 15 fixes
- Split large fix sets across multiple PRs

Next:

- Add source matching report for skipped violations
- Add PR preview before opening
- Add branch cleanup strategy

## Phase 5: Portfolio Polish

Status: pending.

Needed for a stronger public demo:

- Screenshots in README
- Short demo video or GIF
- At least two real external site scans
- One real merged accessibility PR
- Before/after violation count in docs
- Hosted demo with limited scan quota

## Suggested Next Engineering Tasks

1. Add Playwright E2E test for creating a scan using a local fixture site.
2. Add a production session store such as Redis-backed sessions.
3. Add screenshot assets and an architecture diagram to the README.
4. Add GitHub Actions for typecheck, test, and build.
5. Implement React source AST fixes for confident JSX/TSX matches.
