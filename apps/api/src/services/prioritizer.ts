export interface PriorityInput {
  siteUrl: string;
  pageUrl: string;
  impact: string | null | undefined;
  ruleId: string;
  htmlSnippet?: string | null;
  ruleOccurrences: number;
  totalViolations: number;
}

export interface PriorityBreakdown {
  impactWeight: number;
  pageWeight: number;
  elementWeight: number;
  frequencyWeight: number;
  priorityScore: number;
}

const HIGH_VALUE_PATH_PARTS = ["checkout", "signup", "login", "contact", "apply", "donate"];
const INTERACTIVE_TAGS = new Set(["button", "a", "input", "select", "textarea"]);
const FORM_TAGS = new Set(["form", "label", "fieldset"]);
const STRUCTURAL_TAGS = new Set(["div", "span", "p", "h1", "h2", "h3", "h4", "h5", "h6"]);

export function computePriorityScore(input: PriorityInput): PriorityBreakdown {
  const impactWeight = impactWeightFor(input.impact);
  const pageWeight = pageWeightFor(input.siteUrl, input.pageUrl);
  const elementWeight = elementWeightFor(input.htmlSnippet ?? "");
  const frequencyWeight = frequencyWeightFor(input.ruleOccurrences, input.totalViolations);

  const priorityScore = Math.round(
    impactWeight * 0.4 + pageWeight * 0.3 + elementWeight * 0.2 + frequencyWeight * 0.1
  );

  return {
    impactWeight,
    pageWeight,
    elementWeight,
    frequencyWeight,
    priorityScore: clamp(priorityScore, 0, 100)
  };
}

export function impactWeightFor(impact: string | null | undefined): number {
  switch (impact) {
    case "critical":
      return 100;
    case "serious":
      return 75;
    case "moderate":
      return 50;
    case "minor":
      return 25;
    default:
      return 25;
  }
}

export function pageWeightFor(siteUrl: string, pageUrl: string): number {
  const site = new URL(siteUrl);
  const page = new URL(pageUrl, site);
  const path = normalizePath(page.pathname);

  if (page.origin === site.origin && path === "/") return 100;
  if (HIGH_VALUE_PATH_PARTS.some((part) => path.toLowerCase().includes(part))) return 90;

  const depth = path.split("/").filter(Boolean).length;
  if (depth <= 1) return 60;
  return 30;
}

export function elementWeightFor(htmlSnippet: string): number {
  const tag = extractTagName(htmlSnippet);
  if (!tag) return 40;

  if (INTERACTIVE_TAGS.has(tag) || hasInteractiveRole(htmlSnippet)) return 100;
  if (FORM_TAGS.has(tag)) return 90;
  if (tag === "img") return 60;
  if (STRUCTURAL_TAGS.has(tag)) return 40;
  return 40;
}

export function frequencyWeightFor(ruleOccurrences: number, totalViolations: number): number {
  if (totalViolations <= 0 || ruleOccurrences <= 0) return 0;
  return Math.min(100, Math.round((ruleOccurrences / totalViolations) * 300));
}

function extractTagName(htmlSnippet: string): string | null {
  const match = htmlSnippet.match(/^<\s*([a-zA-Z0-9-]+)/);
  return match?.[1]?.toLowerCase() ?? null;
}

function hasInteractiveRole(htmlSnippet: string): boolean {
  return /\srole\s*=\s*["'](?:button|link)["']/i.test(htmlSnippet);
}

function normalizePath(path: string): string {
  if (!path || path === "") return "/";
  return path.endsWith("/") && path.length > 1 ? path.slice(0, -1) : path;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
