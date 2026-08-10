# API Reference

All API routes are prefixed with `/api`.

Errors use this shape:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

## Health

### `GET /api/health`

Returns basic API liveness.

```json
{
  "ok": true
}
```

### `GET /api/health/deep`

Checks API, database, and Redis.

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

## Sites

### `POST /api/sites`

Creates a site for the authenticated user.

Request:

```json
{
  "url": "https://example.org",
  "name": "Example Org"
}
```

Response: `Site`

### `GET /api/sites`

Returns all sites for the authenticated user with recent scan summaries.

Response:

```json
[
  {
    "id": "site_id",
    "url": "https://example.org",
    "name": "Example Org",
    "githubRepo": null,
    "ownerUserId": "user_id",
    "createdAt": "2026-08-10T00:00:00.000Z",
    "recentScans": []
  }
]
```

### `POST /api/sites/:siteId/scans`

Creates a queued scan and enqueues a BullMQ job.

Request:

```json
{}
```

Response: `Scan`

### `POST /api/sites/:siteId/github-connect`

Links a site to a GitHub repository.

Request:

```json
{
  "githubRepo": "owner/repo"
}
```

Response: `Site`

## Scans

### `GET /api/scans/:scanId`

Returns a scan and its violations sorted by:

1. Priority score descending
2. Impact weight descending
3. Page URL alphabetical

Response: `Scan & { violations: Violation[] }`

### `GET /api/scans/:scanId/status`

Returns lightweight polling data.

```json
{
  "status": "SCANNING",
  "pagesScanned": 4
}
```

### `POST /api/scans/:scanId/violations/:violationId/generate-fix`

Generates a safe fix or manual suggestion for one violation.

Request:

```json
{}
```

Response: `Violation`

### `POST /api/scans/:scanId/open-pr`

Opens one or more GitHub pull requests for generated safe fixes.

Response:

```json
{
  "prUrl": "https://github.com/owner/repo/pull/1",
  "prUrls": [
    "https://github.com/owner/repo/pull/1"
  ]
}
```

`prUrl` is the first PR URL for compatibility with the original contract. `prUrls` includes every PR created when fixes are split into batches.

## Auth

### `GET /api/auth/github`

Starts GitHub OAuth.

### `GET /api/auth/github/callback`

Handles the OAuth callback, encrypts the access token, stores the user, and redirects to the frontend.
