# Scanning and Prioritization

A11yFix uses existing accessibility engines for detection and custom logic for prioritization.

## Crawling

The crawler uses Puppeteer so audits run against the rendered DOM, not just static HTML.

Crawler constraints:

- Same-origin links only
- Configurable max pages, default `25`
- Configurable page timeout, default `15000` ms
- Skips common binary/static file extensions
- Validates each crawl URL against SSRF protections

## Accessibility Detection

The scanner uses `@axe-core/puppeteer`, which injects axe-core into the page context.

The scan targets WCAG 2.0 and 2.1 A/AA tags:

```txt
wcag2a
wcag2aa
wcag21a
wcag21aa
```

Each axe node result becomes one stored `Violation`.

## Priority Score

Raw axe impact alone is not enough. A critical footer issue may matter less than a moderate issue blocking a signup form.

A11yFix computes:

```txt
priorityScore = round(
  (impactWeight * 0.4) +
  (pageWeight * 0.3) +
  (elementWeight * 0.2) +
  (frequencyWeight * 0.1)
)
```

## Impact Weight

```txt
critical  -> 100
serious   -> 75
moderate  -> 50
minor     -> 25
```

## Page Weight

```txt
homepage                                      -> 100
checkout/signup/login/contact/apply/donate   -> 90
path depth <= 1                               -> 60
path depth >= 2                               -> 30
```

## Element Weight

```txt
button, a, input, select, textarea, role button/link -> 100
form, label, fieldset                                -> 90
img                                                  -> 60
div, span, p, headings                               -> 40
```

## Frequency Weight

```txt
frequencyWeight = min(100, (occurrencesOfRuleId / totalViolations) * 300)
```

This raises the score for systemic issues. If the same broken component creates many violations, fixing it can remove many problems at once.

## Sort Order

The UI sorts violations by:

1. `priorityScore` descending
2. `impactWeight` descending
3. `pageUrl` alphabetical

This makes the first screen of results useful as a real remediation backlog.
