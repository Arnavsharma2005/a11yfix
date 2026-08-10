import type { Page } from "puppeteer";
import { AxePuppeteer } from "@axe-core/puppeteer";
import type { NodeResult, Result } from "axe-core";

export interface RawViolation {
  pageUrl: string;
  ruleId: string;
  wcagCriteria: string;
  impact: string;
  selector: string;
  htmlSnippet: string;
  description: string;
  metadata: Record<string, unknown>;
}

const WCAG_TAG_PATTERN = /^wcag(\d)(\d)(\d)$/;

export async function scanOpenPage(page: Page): Promise<Result[]> {
  const results = await new AxePuppeteer(page)
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  return results.violations;
}

export function flattenAxeViolations(pageUrl: string, violations: Result[]): RawViolation[] {
  return violations.flatMap((violation) =>
    violation.nodes.map((node) => ({
      pageUrl,
      ruleId: violation.id,
      wcagCriteria: wcagCriteriaFromTags(violation.tags),
      impact: violation.impact ?? "minor",
      selector: selectorFromNode(node),
      htmlSnippet: truncate(node.html ?? "", 500),
      description: violation.help,
      metadata: {
        helpUrl: violation.helpUrl,
        target: node.target,
        failureSummary: node.failureSummary,
        any: node.any,
        all: node.all,
        none: node.none
      }
    }))
  );
}

export function wcagCriteriaFromTags(tags: string[]): string {
  const criteria = tags
    .map((tag) => tag.match(WCAG_TAG_PATTERN))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => `${match[1]}.${match[2]}.${match[3]}`);

  return [...new Set(criteria)].join(", ") || "unknown";
}

function selectorFromNode(node: NodeResult): string {
  if (!node.target || node.target.length === 0) return "";
  return String(node.target[0]);
}

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
}
