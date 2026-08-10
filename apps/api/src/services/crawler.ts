import puppeteer from "puppeteer";
import type { Browser, Page } from "puppeteer";
import { config } from "../config";
import { assertCrawlableUrl } from "../security/url";
import { flattenAxeViolations, scanOpenPage, type RawViolation } from "./scanner";

export interface PageAuditResult {
  url: string;
  title: string | null;
  rawHtml: string;
  violations: RawViolation[];
}

export interface CrawlOptions {
  maxPages?: number;
  pageTimeoutMs?: number;
  onPageComplete?: (pagesScanned: number) => Promise<void>;
}

const SKIPPED_DOCUMENT_EXTENSIONS =
  /\.(?:pdf|zip|rar|7z|png|jpe?g|gif|svg|webp|avif|mp4|mp3|mov|css|js|woff2?|ttf|ico)$/i;

export async function crawlAndScan(startUrl: string, options: CrawlOptions = {}): Promise<PageAuditResult[]> {
  const start = await assertCrawlableUrl(startUrl);
  const maxPages = Math.min(options.maxPages ?? config.maxPagesPerScan, config.maxPagesPerScan);
  const pageTimeoutMs = options.pageTimeoutMs ?? config.pageTimeoutMs;
  const browser = await launchBrowser();

  try {
    const queue = [normalizeUrl(start.href)];
    const visited = new Set<string>();
    const results: PageAuditResult[] = [];

    while (queue.length > 0 && results.length < maxPages) {
      const currentUrl = queue.shift();
      if (!currentUrl || visited.has(currentUrl)) continue;
      visited.add(currentUrl);

      await assertCrawlableUrl(currentUrl);
      const page = await browser.newPage();

      try {
        page.setDefaultNavigationTimeout(pageTimeoutMs);
        await page.goto(currentUrl, {
          waitUntil: "networkidle2",
          timeout: pageTimeoutMs
        });

        const [title, rawHtml, violations, links] = await Promise.all([
          safeTitle(page),
          page.content(),
          scanOpenPage(page).then((axeViolations) => flattenAxeViolations(currentUrl, axeViolations)),
          extractLinks(page)
        ]);

        results.push({
          url: currentUrl,
          title,
          rawHtml,
          violations
        });

        await options.onPageComplete?.(results.length);

        for (const href of links) {
          const normalized = normalizeUrl(href);
          if (!normalized) continue;
          if (visited.has(normalized)) continue;
          if (!isSameOrigin(start, normalized)) continue;
          if (SKIPPED_DOCUMENT_EXTENSIONS.test(new URL(normalized).pathname)) continue;
          if (queue.length + visited.size >= maxPages) continue;
          queue.push(normalized);
        }
      } finally {
        await page.close().catch(() => undefined);
      }
    }

    return results;
  } finally {
    await browser.close().catch(() => undefined);
  }
}

async function launchBrowser(): Promise<Browser> {
  return puppeteer.launch({
    headless: true,
    args: config.puppeteerNoSandbox ? ["--no-sandbox"] : []
  });
}

async function safeTitle(page: Page): Promise<string | null> {
  try {
    return await page.title();
  } catch {
    return null;
  }
}

async function extractLinks(page: Page): Promise<string[]> {
  return page.$$eval("a[href]", (anchors) =>
    anchors
      .map((anchor) => (anchor as HTMLAnchorElement).href)
      .filter((href) => href.startsWith("http://") || href.startsWith("https://"))
  );
}

function normalizeUrl(input: string): string {
  const url = new URL(input);
  url.hash = "";
  return url.href;
}

function isSameOrigin(start: URL, candidate: string): boolean {
  return new URL(candidate).origin === start.origin;
}
