# Fix Generation

A11yFix only auto-generates fixes when the safe change is clear. If the correct fix needs human judgment, the system returns a manual-review suggestion instead.

## Supported Rules

| axe rule | Behavior |
| --- | --- |
| `image-alt` | Auto-fix |
| `label` | Auto-fix |
| `link-name` | Auto-fix |
| `button-name` | Auto-fix |
| `html-has-lang` | Auto-fix |
| `color-contrast` | Suggest only |

## `image-alt`

If an image has no `alt` attribute:

- Adds `alt=""` when the image appears decorative.
- Adds `alt="[NEEDS HUMAN REVIEW: describe this image]"` otherwise.

Decorative heuristics:

- Parent has `aria-hidden="true"`
- Image filename contains `icon`, `spacer`, or `divider`

The system never invents descriptive alt text. A guessed alt text can be worse than a missing alt text.

## `label`

For unlabeled inputs:

- If the input has an `id`, inserts a `<label for="...">` immediately before it.
- If the input has placeholder text, uses that text as the label and adds a review comment.
- Otherwise inserts `[NEEDS HUMAN REVIEW: field purpose]`.

Placeholder text is treated as a hint, not a final source of truth.

## `link-name`

For empty links:

- If the link wraps an image with alt text, uses that alt text as `aria-label`.
- Otherwise adds `aria-label="[NEEDS HUMAN REVIEW: link destination]"`.

## `button-name`

For empty buttons:

- Uses the same strategy as `link-name`.
- Adds `aria-label="[NEEDS HUMAN REVIEW: button action]"` when no better text exists.

## `html-has-lang`

Adds:

```html
<html lang="en">
```

The PR body flags this as an assumption so a reviewer can change it if the site is not English-primary.

## `color-contrast`

Color contrast is not auto-applied. The system computes a suggested foreground color that meets WCAG AA contrast where axe exposes enough color data.

This is suggest-only because color changes affect branding and design systems.

## Pull Request Automation

The PR flow only uses generated safe fixes.

Safety rules:

- No more than 15 fixes in one PR.
- More than 15 fixes are split across multiple PRs.
- Static HTML source files are edited only when a unique confident match is found.
- Ambiguous matches are skipped.
- JSX/TSX source edits are not guessed.

The guiding rule is simple: prefer a manual-review flag over a risky automated edit.
