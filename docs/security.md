# Security Notes

A11yFix crawls user-submitted URLs, stores OAuth tokens, and can modify GitHub repositories. Security constraints are part of the core design, not polish.

## SSRF Protection

Before crawling, submitted URLs are validated.

Rejected targets include:

- `localhost`
- `127.0.0.1`
- `10.x.x.x`
- `172.16.x.x` through `172.31.x.x`
- `192.168.x.x`
- `169.254.x.x`
- `169.254.169.254`
- IPv6 loopback/link-local/private ranges

The hostname is resolved with DNS and resolved IPs are checked too.

## Crawl Limits

The crawler is bounded to prevent accidental abuse.

Defaults:

```txt
MAX_PAGES_PER_SCAN=25
PAGE_TIMEOUT_MS=15000
```

The crawler stays on the same origin and skips common static/binary file types.

## Rate Limiting

Scan creation is rate-limited per user:

```txt
5 scans per hour
```

This helps prevent the crawler from becoming an open abuse tool.

## GitHub Token Storage

GitHub access tokens are encrypted at rest with AES-256-GCM.

The encryption key is read from:

```txt
TOKEN_ENCRYPTION_KEY
```

The key must decode to 32 bytes. It must never be hardcoded.

## Puppeteer Sandbox

By default, Puppeteer should run sandboxed.

Set this only in environments that require it:

```txt
PUPPETEER_NO_SANDBOX=true
```

## PR Automation Safety

The PR system is intentionally conservative:

- Only generated safe fixes are eligible.
- Each PR is capped at 15 fixes.
- Ambiguous source matches are skipped.
- Human-review placeholders are used when content meaning is unknown.

This avoids silently introducing incorrect accessibility content.
