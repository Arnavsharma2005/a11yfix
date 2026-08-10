import { describe, expect, it } from "vitest";
import { computePriorityScore, elementWeightFor, frequencyWeightFor, pageWeightFor } from "./prioritizer";

describe("prioritizer", () => {
  it("scores homepage interactive critical issues at the top of the range", () => {
    const result = computePriorityScore({
      siteUrl: "https://example.org",
      pageUrl: "https://example.org/",
      impact: "critical",
      ruleId: "button-name",
      htmlSnippet: "<button></button>",
      ruleOccurrences: 10,
      totalViolations: 10
    });

    expect(result.priorityScore).toBe(100);
  });

  it("weights lower impact nested structural issues much lower", () => {
    const result = computePriorityScore({
      siteUrl: "https://example.org",
      pageUrl: "https://example.org/events/archive/2025",
      impact: "minor",
      ruleId: "region",
      htmlSnippet: "<div></div>",
      ruleOccurrences: 1,
      totalViolations: 10
    });

    expect(result.priorityScore).toBe(30);
  });

  it("detects high value conversion paths", () => {
    expect(pageWeightFor("https://example.org", "https://example.org/donate")).toBe(90);
    expect(pageWeightFor("https://example.org", "https://example.org/about")).toBe(60);
    expect(pageWeightFor("https://example.org", "https://example.org/blog/post")).toBe(30);
  });

  it("weights interactive roles as interactive elements", () => {
    expect(elementWeightFor('<div role="button"></div>')).toBe(100);
  });

  it("normalizes repeated rule frequency", () => {
    expect(frequencyWeightFor(40, 100)).toBe(100);
    expect(frequencyWeightFor(1, 10)).toBe(30);
  });
});
