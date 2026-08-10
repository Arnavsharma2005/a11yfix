import { describe, expect, it } from "vitest";
import { generateFixForViolation, suggestAccessibleForeground } from "./fixGenerator";

describe("fixGenerator", () => {
  it("adds a human-review alt placeholder for non-decorative images", () => {
    const result = generateFixForViolation({
      ruleId: "image-alt",
      selector: "img",
      pageUrl: "https://example.org",
      pageHtml: "<!doctype html><html><body><img src=\"/hero.jpg\"></body></html>",
      htmlSnippet: "<img src=\"/hero.jpg\">"
    });

    expect(result.fixAvailable).toBe(true);
    expect(result.fixedHtml).toContain('alt="[NEEDS HUMAN REVIEW: describe this image]"');
  });

  it("uses empty alt text for decorative image filenames", () => {
    const result = generateFixForViolation({
      ruleId: "image-alt",
      selector: "img",
      pageUrl: "https://example.org",
      pageHtml: "<!doctype html><html><body><img src=\"/icon-menu.svg\"></body></html>",
      htmlSnippet: "<img src=\"/icon-menu.svg\">"
    });

    expect(result.fixedHtml).toContain('alt=""');
  });

  it("inserts a label before an input with a placeholder", () => {
    const result = generateFixForViolation({
      ruleId: "label",
      selector: "input",
      pageUrl: "https://example.org/contact",
      pageHtml: "<!doctype html><html><body><form><input id=\"email\" placeholder=\"Email\"></form></body></html>",
      htmlSnippet: "<input id=\"email\" placeholder=\"Email\">"
    });

    expect(result.fixedHtml).toContain('<label for="email">Email</label>');
    expect(result.fixedHtml).toContain("A11yFix: label text derived from placeholder");
  });

  it("uses wrapped image alt text for empty links", () => {
    const result = generateFixForViolation({
      ruleId: "link-name",
      selector: "a",
      pageUrl: "https://example.org",
      pageHtml: "<!doctype html><html><body><a href=\"/\"><img src=\"/logo.png\" alt=\"Home\"></a></body></html>",
      htmlSnippet: "<a href=\"/\"><img src=\"/logo.png\" alt=\"Home\"></a>"
    });

    expect(result.fixedHtml).toContain('aria-label="Home"');
  });

  it("adds lang=en to html when missing", () => {
    const result = generateFixForViolation({
      ruleId: "html-has-lang",
      selector: "html",
      pageUrl: "https://example.org",
      pageHtml: "<!doctype html><html><body>Hello</body></html>",
      htmlSnippet: "<html>"
    });

    expect(result.fixedHtml).toContain('<html lang="en">');
  });

  it("suggests a changed foreground color for weak contrast", () => {
    const suggestion = suggestAccessibleForeground("#777777", "#ffffff", 4.5);
    expect(suggestion).not.toBeNull();
    expect(suggestion).not.toBe("#777777");
  });
});
