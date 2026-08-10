import { createTwoFilesPatch } from "diff";
import { Element, Text, Comment } from "domhandler";
import { selectOne } from "css-select";
import * as parse5 from "parse5";
import { adapter as htmlparser2Adapter } from "parse5-htmlparser2-tree-adapter";

type DomNode = {
  type?: string;
  name?: string;
  data?: string;
  parent?: DomNode | null;
  children?: DomNode[];
  attribs?: Record<string, string>;
};

export interface FixGenerationInput {
  ruleId: string;
  selector: string;
  pageUrl: string;
  pageHtml: string;
  htmlSnippet: string;
  metadata?: unknown;
}

export interface FixGenerationResult {
  fixAvailable: boolean;
  changed: boolean;
  suggestedFix: string;
  fixedHtml?: string;
}

const AUTO_FIXABLE_RULES = new Set(["image-alt", "label", "link-name", "button-name", "html-has-lang"]);
const DECORATIVE_IMAGE_PATTERN = /(?:icon|spacer|divider)/i;

export function isAutoFixableRule(ruleId: string): boolean {
  return AUTO_FIXABLE_RULES.has(ruleId);
}

export function generateFixForViolation(input: FixGenerationInput): FixGenerationResult {
  if (input.ruleId === "color-contrast") {
    return {
      fixAvailable: false,
      changed: false,
      suggestedFix: suggestColorContrastFix(input.metadata)
    };
  }

  if (!isAutoFixableRule(input.ruleId)) {
    return {
      fixAvailable: false,
      changed: false,
      suggestedFix: manualSuggestionFor(input.ruleId)
    };
  }

  const document = parseHtml(input.pageHtml);
  const changed = applyRuleFix(document, input);

  if (!changed) {
    return {
      fixAvailable: false,
      changed: false,
      suggestedFix: manualSuggestionFor(input.ruleId)
    };
  }

  const fixedHtml = serializeHtml(document);
  return {
    fixAvailable: true,
    changed: true,
    fixedHtml,
    suggestedFix: createTwoFilesPatch(
      `${input.pageUrl} before`,
      `${input.pageUrl} after`,
      input.pageHtml,
      fixedHtml,
      "",
      "",
      { context: 3 }
    )
  };
}

function applyRuleFix(document: DomNode, input: FixGenerationInput): boolean {
  switch (input.ruleId) {
    case "image-alt":
      return applyImageAltFix(document, input);
    case "label":
      return applyLabelFix(document, input);
    case "link-name":
      return applyNameFix(document, input, "a");
    case "button-name":
      return applyNameFix(document, input, "button");
    case "html-has-lang":
      return applyHtmlLangFix(document);
    default:
      return false;
  }
}

function applyImageAltFix(document: DomNode, input: FixGenerationInput): boolean {
  const target = findTargetElement(document, input.selector);
  const image = elementName(target) === "img" ? target : findDescendantElement(target, "img");

  if (!image || hasAttr(image, "alt")) return false;

  const src = getAttr(image, "src") ?? "";
  const parentHidden = getAttr(image.parent ?? null, "aria-hidden") === "true";
  const decorative = parentHidden || DECORATIVE_IMAGE_PATTERN.test(src);
  setAttr(image, "alt", decorative ? "" : "[NEEDS HUMAN REVIEW: describe this image]");
  return true;
}

function applyLabelFix(document: DomNode, input: FixGenerationInput): boolean {
  const target = findTargetElement(document, input.selector);
  const inputElement = elementName(target) === "input" ? target : findDescendantElement(target, "input");
  if (!inputElement) return false;

  const inputId = getAttr(inputElement, "id");
  if (!inputId || hasAssociatedLabel(document, inputId)) return false;

  const placeholder = getAttr(inputElement, "placeholder");
  const labelText = placeholder?.trim() || "[NEEDS HUMAN REVIEW: field purpose]";
  const label = new Element("label", { for: inputId }, [new Text(labelText)]) as unknown as DomNode;
  wireParents(label);

  const nodesToInsert: DomNode[] = [];
  if (placeholder?.trim()) {
    const comment = new Comment(" A11yFix: label text derived from placeholder; review for accuracy. ") as unknown as DomNode;
    nodesToInsert.push(comment);
  }

  nodesToInsert.push(label);
  return insertBefore(inputElement, nodesToInsert);
}

function applyNameFix(document: DomNode, input: FixGenerationInput, expectedTag: "a" | "button"): boolean {
  const target = findTargetElement(document, input.selector);
  const namedElement =
    elementName(target) === expectedTag ? target : findDescendantElement(target, expectedTag);

  if (!namedElement || hasAttr(namedElement, "aria-label")) return false;
  if (textContent(namedElement).trim()) return false;

  const imageAlt = findDescendantImageAlt(namedElement);
  const label =
    imageAlt || `[NEEDS HUMAN REVIEW: ${expectedTag === "a" ? "link destination" : "button action"}]`;
  setAttr(namedElement, "aria-label", label);
  return true;
}

function applyHtmlLangFix(document: DomNode): boolean {
  const html = findTargetElement(document, "html");
  if (!html || hasAttr(html, "lang")) return false;
  setAttr(html, "lang", "en");
  return true;
}

function parseHtml(html: string): DomNode {
  return parse5.parse(html, { treeAdapter: htmlparser2Adapter }) as unknown as DomNode;
}

function serializeHtml(document: DomNode): string {
  return parse5.serialize(document as never, { treeAdapter: htmlparser2Adapter });
}

function findTargetElement(document: DomNode, selector: string): DomNode | null {
  try {
    const root = document.children ?? [document];
    const selected = selectOne(selector, root as never) as DomNode | null;
    return selected && isElement(selected) ? selected : null;
  } catch {
    return null;
  }
}

function findDescendantElement(node: DomNode | null, tagName: string): DomNode | null {
  if (!node) return null;
  if (elementName(node) === tagName) return node;

  for (const child of node.children ?? []) {
    const match = findDescendantElement(child, tagName);
    if (match) return match;
  }

  return null;
}

function findDescendantImageAlt(node: DomNode): string | null {
  const image = findDescendantElement(node, "img");
  const alt = image ? getAttr(image, "alt") : null;
  return alt?.trim() || null;
}

function hasAssociatedLabel(document: DomNode, inputId: string): boolean {
  return Boolean(findLabelForId(document, inputId));
}

function findLabelForId(node: DomNode, inputId: string): DomNode | null {
  if (elementName(node) === "label" && getAttr(node, "for") === inputId) return node;

  for (const child of node.children ?? []) {
    const match = findLabelForId(child, inputId);
    if (match) return match;
  }

  return null;
}

function insertBefore(referenceNode: DomNode, nodes: DomNode[]): boolean {
  const parent = referenceNode.parent;
  if (!parent?.children) return false;

  const index = parent.children.indexOf(referenceNode);
  if (index === -1) return false;

  for (const node of nodes) {
    node.parent = parent;
  }

  parent.children.splice(index, 0, ...nodes);
  return true;
}

function textContent(node: DomNode): string {
  if (node.type === "text") return node.data ?? "";
  return (node.children ?? []).map(textContent).join("");
}

function isElement(node: DomNode): boolean {
  return node.type === "tag" || node.type === "script" || node.type === "style" || Boolean(node.name);
}

function elementName(node: DomNode | null): string | null {
  if (!node || !isElement(node) || !node.name) return null;
  return node.name.toLowerCase();
}

function getAttr(node: DomNode | null, name: string): string | undefined {
  return node?.attribs?.[name];
}

function hasAttr(node: DomNode | null, name: string): boolean {
  return getAttr(node, name) !== undefined;
}

function setAttr(node: DomNode, name: string, value: string): void {
  node.attribs = node.attribs ?? {};
  node.attribs[name] = value;
}

function wireParents(node: DomNode): void {
  for (const child of node.children ?? []) {
    child.parent = node;
    wireParents(child);
  }
}

function manualSuggestionFor(ruleId: string): string {
  switch (ruleId) {
    case "color-contrast":
      return "Review the foreground and background colors and adjust them to meet WCAG AA contrast.";
    default:
      return `Manual review required for axe-core rule "${ruleId}". Use the reported selector and HTML snippet as the starting point.`;
  }
}

interface ColorData {
  fgColor?: string;
  bgColor?: string;
  contrastRatio?: number;
  fontSize?: string | number;
  fontWeight?: string | number;
}

function suggestColorContrastFix(metadata: unknown): string {
  const colorData = findColorData(metadata);
  const foreground = normalizeColor(colorData?.fgColor);
  const background = normalizeColor(colorData?.bgColor);

  if (!foreground || !background) {
    return "Color contrast failed. Axe did not expose enough color data to compute a safe suggestion, so this needs manual review.";
  }

  const targetRatio = isLargeText(colorData) ? 3 : 4.5;
  const currentRatio = contrastRatio(hexToRgb(foreground), hexToRgb(background));
  const suggested = suggestAccessibleForeground(foreground, background, targetRatio);

  if (!suggested) {
    return `Current foreground ${foreground} on background ${background} has contrast ${currentRatio.toFixed(
      2
    )}:1. Manual color review is needed to reach WCAG AA ${targetRatio}:1.`;
  }

  return `Current foreground ${foreground} on background ${background} has contrast ${currentRatio.toFixed(
    2
  )}:1. Suggested foreground ${suggested} reaches ${contrastRatio(
    hexToRgb(suggested),
    hexToRgb(background)
  ).toFixed(2)}:1 against WCAG AA target ${targetRatio}:1. Review before applying because this can affect brand color decisions.`;
}

function findColorData(value: unknown): ColorData | null {
  if (!value || typeof value !== "object") return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const result = findColorData(item);
      if (result) return result;
    }
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.fgColor === "string" && typeof record.bgColor === "string") {
    return record as ColorData;
  }

  if (record.data && typeof record.data === "object") {
    const result = findColorData(record.data);
    if (result) return result;
  }

  for (const nested of Object.values(record)) {
    const result = findColorData(nested);
    if (result) return result;
  }

  return null;
}

function normalizeColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();

  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    const [, r, g, b] = trimmed.toLowerCase();
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  const rgbMatch = trimmed.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!rgbMatch) return null;

  return rgbToHex({
    r: Number.parseInt(rgbMatch[1], 10),
    g: Number.parseInt(rgbMatch[2], 10),
    b: Number.parseInt(rgbMatch[3], 10)
  });
}

function isLargeText(colorData: ColorData | null): boolean {
  if (!colorData) return false;

  const size = typeof colorData.fontSize === "string" ? Number.parseFloat(colorData.fontSize) : colorData.fontSize;
  const weight =
    typeof colorData.fontWeight === "string" ? Number.parseInt(colorData.fontWeight, 10) : colorData.fontWeight;

  if (!size) return false;
  return size >= 24 || (size >= 18.66 && Boolean(weight && weight >= 700));
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

interface Hsl {
  h: number;
  s: number;
  l: number;
}

export function suggestAccessibleForeground(foreground: string, background: string, targetRatio: number): string | null {
  const foregroundRgb = hexToRgb(foreground);
  const backgroundRgb = hexToRgb(background);
  if (contrastRatio(foregroundRgb, backgroundRgb) >= targetRatio) return foreground.toLowerCase();

  const original = rgbToHsl(foregroundRgb);
  let best: { hex: string; delta: number } | null = null;

  for (let step = 1; step <= 100; step += 1) {
    const delta = step / 100;
    const candidates = [original.l - delta, original.l + delta].filter((l) => l >= 0 && l <= 1);

    for (const lightness of candidates) {
      const hex = rgbToHex(hslToRgb({ ...original, l: lightness }));
      const ratio = contrastRatio(hexToRgb(hex), backgroundRgb);
      if (ratio >= targetRatio) {
        if (!best || delta < best.delta) {
          best = { hex, delta };
        }
      }
    }

    if (best) return best.hex;
  }

  return null;
}

export function contrastRatio(foreground: Rgb, background: Rgb): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(rgb: Rgb): number {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hexToRgb(hex: string): Rgb {
  const normalized = hex.replace("#", "");
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16)
  };
}

function rgbToHex(rgb: Rgb): string {
  return `#${[rgb.r, rgb.g, rgb.b].map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0")).join("")}`;
}

function rgbToHsl(rgb: Rgb): Hsl {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;

  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h /= 6;
    if (h < 0) h += 1;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h, s, l };
}

function hslToRgb(hsl: Hsl): Rgb {
  const c = (1 - Math.abs(2 * hsl.l - 1)) * hsl.s;
  const x = c * (1 - Math.abs(((hsl.h * 6) % 2) - 1));
  const m = hsl.l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  const hue = hsl.h * 6;

  if (hue >= 0 && hue < 1) [r, g, b] = [c, x, 0];
  else if (hue < 2) [r, g, b] = [x, c, 0];
  else if (hue < 3) [r, g, b] = [0, c, x];
  else if (hue < 4) [r, g, b] = [0, x, c];
  else if (hue < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return {
    r: (r + m) * 255,
    g: (g + m) * 255,
    b: (b + m) * 255
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
