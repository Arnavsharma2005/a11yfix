import type { Scan, ScanStatusResponse, ScanWithViolations, Site, SiteSummary, Violation } from "@a11yfix/shared-types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

// --- MOCK DEMO DATA FOR HOSTED DEMO MODE ---

const MOCK_VIOLATIONS: Violation[] = [
  {
    id: "viol-1",
    scanId: "demo-scan-1",
    pageUrl: "https://store.acme-demo.org/",
    ruleId: "image-alt",
    wcagCriteria: "1.1.1",
    impact: "critical",
    selector: "header > div.hero > img",
    htmlSnippet: `<img src="/assets/hero-promo.jpg" class="w-full rounded-lg shadow">`,
    description: "Images must have alternate text describing visual content.",
    priorityScore: 95,
    fixAvailable: true,
    suggestedFix: `@@ -1 +1 @@\n- <img src="/assets/hero-promo.jpg" class="w-full rounded-lg shadow">\n+ <img src="/assets/hero-promo.jpg" alt="Acme Store promotional hero banner showing featured products" class="w-full rounded-lg shadow">`,
    status: "FIX_GENERATED"
  },
  {
    id: "viol-2",
    scanId: "demo-scan-1",
    pageUrl: "https://store.acme-demo.org/cart",
    ruleId: "button-name",
    wcagCriteria: "4.1.2",
    impact: "critical",
    selector: "div.cart-actions > button.checkout-icon",
    htmlSnippet: `<button class="p-2 rounded bg-emerald-600 text-white"><svg class="h-5 w-5">...</svg></button>`,
    description: "Buttons must have discernible text for screen reader users.",
    priorityScore: 88,
    fixAvailable: true,
    suggestedFix: `@@ -1 +1 @@\n- <button class="p-2 rounded bg-emerald-600 text-white"><svg class="h-5 w-5">...</svg></button>\n+ <button aria-label="Proceed to checkout" class="p-2 rounded bg-emerald-600 text-white"><svg class="h-5 w-5">...</svg></button>`,
    status: "OPEN"
  },
  {
    id: "viol-3",
    scanId: "demo-scan-1",
    pageUrl: "https://store.acme-demo.org/",
    ruleId: "html-has-lang",
    wcagCriteria: "3.1.1",
    impact: "moderate",
    selector: "html",
    htmlSnippet: `<html class="dark">`,
    description: "<html> element must have a lang attribute for accessibility engines.",
    priorityScore: 72,
    fixAvailable: true,
    suggestedFix: `@@ -1 +1 @@\n- <html class="dark">\n+ <html lang="en" class="dark">`,
    status: "OPEN"
  },
  {
    id: "viol-4",
    scanId: "demo-scan-1",
    pageUrl: "https://store.acme-demo.org/checkout",
    ruleId: "label",
    wcagCriteria: "1.3.1",
    impact: "serious",
    selector: "form > div.input-group > input#email",
    htmlSnippet: `<input id="email" type="email" placeholder="Enter your email" class="border p-2">`,
    description: "Form inputs must have explicit visual or programmatic labels.",
    priorityScore: 84,
    fixAvailable: true,
    suggestedFix: `@@ -1 +1 @@\n- <input id="email" type="email" placeholder="Enter your email" class="border p-2">\n+ <label for="email" class="sr-only">Email Address</label>\n+ <input id="email" type="email" placeholder="Enter your email" class="border p-2">`,
    status: "OPEN"
  }
];

const MOCK_SITES: SiteSummary[] = [
  {
    id: "demo-site-1",
    url: "https://store.acme-demo.org",
    name: "Acme Store Front",
    githubRepo: "acme/store-frontend",
    ownerUserId: "user-demo",
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    recentScans: [
      {
        id: "demo-scan-1",
        status: "COMPLETED",
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        completedAt: new Date(Date.now() - 3500000).toISOString(),
        totalViolations: 4,
        averagePriorityScore: 85
      },
      {
        id: "demo-scan-0",
        status: "COMPLETED",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        completedAt: new Date(Date.now() - 86300000).toISOString(),
        totalViolations: 7,
        averagePriorityScore: 91
      }
    ]
  },
  {
    id: "demo-site-2",
    url: "https://blog.techcorp-demo.io",
    name: "TechCorp Blog",
    githubRepo: "techcorp/blog",
    ownerUserId: "user-demo",
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    recentScans: [
      {
        id: "demo-scan-2",
        status: "COMPLETED",
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        completedAt: new Date(Date.now() - 172700000).toISOString(),
        totalViolations: 2,
        averagePriorityScore: 45
      }
    ]
  }
];

const dynamicSites = [...MOCK_SITES];
const dynamicViolations = [...MOCK_VIOLATIONS];

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: "include",
      headers: {
        "content-type": "application/json",
        ...init.headers
      },
      ...init
    });
  } catch (_fetchErr) {
    // If fetch failed completely (backend offline or static GitHub Pages mode), fall back to interactive demo data
    return handleMockFallback<T>(path, init);
  }

  // When a real HTTP response is received:
  const body = await response.json().catch(() => undefined);
  if (!response.ok) {
    // If static hosting (GitHub Pages) returns 404/405 HTML pages without a structured API JSON error body:
    if (!body || !body.error) {
      return handleMockFallback<T>(path, init);
    }

    const message = body?.error?.message ?? `Request failed with status ${response.status}.`;
    const err = new Error(message) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  return body as T;
}

function handleMockFallback<T>(path: string, init: RequestInit): T {
  const method = (init.method ?? "GET").toUpperCase();

  if (path === "/github/me" && method === "GET") {
    return { id: "demo-user-id", githubLogin: "demo-developer" } as unknown as T;
  }

  if (path === "/sites" && method === "GET") {
    return dynamicSites as unknown as T;
  }

  if (path === "/sites" && method === "POST") {
    const body = JSON.parse((init.body as string) ?? "{}");
    const newSite: Site = {
      id: `site-${Date.now()}`,
      url: body.url || "https://example.com",
      name: body.name || new URL(body.url || "https://example.com").hostname,
      githubRepo: null,
      ownerUserId: "demo-user",
      createdAt: new Date().toISOString()
    };
    const summary: SiteSummary = {
      ...newSite,
      recentScans: []
    };
    dynamicSites.unshift(summary);
    return newSite as unknown as T;
  }

  if (path.includes("/github-connect") && method === "POST") {
    const body = JSON.parse((init.body as string) ?? "{}");
    const siteId = path.split("/")[2];
    const targetSite = dynamicSites.find((s) => s.id === siteId) || dynamicSites[0];
    if (targetSite) {
      targetSite.githubRepo = body.githubRepo;
    }
    return targetSite as unknown as T;
  }

  if (path.startsWith("/sites/") && path.endsWith("/scans") && method === "POST") {
    const siteId = path.split("/")[2];
    const newScanId = `scan-${Date.now()}`;
    const newScan: Scan = {
      id: newScanId,
      siteId,
      status: "COMPLETED",
      pagesScanned: 5,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    const targetSite = dynamicSites.find((s) => s.id === siteId);
    if (targetSite) {
      targetSite.recentScans.unshift({
        id: newScanId,
        status: "COMPLETED",
        createdAt: newScan.createdAt,
        completedAt: newScan.completedAt,
        totalViolations: 4,
        averagePriorityScore: 85
      });
    }

    return newScan as unknown as T;
  }

  if (path.startsWith("/scans/") && !path.includes("status") && !path.includes("generate-fix") && !path.includes("open-pr") && method === "GET") {
    const scanId = path.split("/")[2];
    const parentSite = dynamicSites.find((s) => s.id === "demo-site-1") || dynamicSites[0];
    const scan: ScanWithViolations = {
      id: scanId,
      siteId: parentSite.id,
      site: parentSite,
      status: "COMPLETED",
      pagesScanned: 6,
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      completedAt: new Date(Date.now() - 3500000).toISOString(),
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      violations: dynamicViolations
    };
    return scan as unknown as T;
  }

  if (path.includes("/status") && method === "GET") {
    return { status: "COMPLETED", pagesScanned: 6 } as unknown as T;
  }

  if (path.includes("/generate-fix") && method === "POST") {
    const parts = path.split("/");
    const violationId = parts[4];
    const target = dynamicViolations.find((v) => v.id === violationId);
    if (target) {
      target.suggestedFix = `@@ -1 +1 @@\n- ${target.htmlSnippet}\n+ ${target.htmlSnippet.replace(">", ' alt="Accessibility audit remediation">')}`;
      target.status = "FIX_GENERATED";
      return target as unknown as T;
    }
  }

  if (path.includes("/open-pr") && method === "POST") {
    const prUrl = "https://github.com/acme/store-frontend/pull/42";
    dynamicViolations.forEach((v) => {
      if (v.status === "FIX_GENERATED") {
        v.status = "PR_OPENED";
        v.prUrl = prUrl;
      }
    });
    return { prUrl, prUrls: [prUrl] } as unknown as T;
  }

  return [] as unknown as T;
}

export function getCurrentUser(): Promise<{ id: string; githubLogin: string }> {
  return request<{ id: string; githubLogin: string }>("/github/me");
}

export function listSites(): Promise<SiteSummary[]> {
  return request<SiteSummary[]>("/sites");
}

export function createSite(payload: { url: string; name?: string }): Promise<Site> {
  return request<Site>("/sites", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function githubConnect(siteId: string, githubRepo: string): Promise<Site> {
  return request<Site>(`/sites/${siteId}/github-connect`, {
    method: "POST",
    body: JSON.stringify({ githubRepo })
  });
}

export function createScan(siteId: string): Promise<Scan> {
  return request<Scan>(`/sites/${siteId}/scans`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export function getScan(scanId: string): Promise<ScanWithViolations> {
  return request<ScanWithViolations>(`/scans/${scanId}`);
}

export function getScanStatus(scanId: string): Promise<ScanStatusResponse> {
  return request<ScanStatusResponse>(`/scans/${scanId}/status`);
}

export function generateFix(scanId: string, violationId: string): Promise<Violation> {
  return request<Violation>(`/scans/${scanId}/violations/${violationId}/generate-fix`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export function openPr(scanId: string): Promise<{ prUrl: string; prUrls: string[] }> {
  return request<{ prUrl: string; prUrls: string[] }>(`/scans/${scanId}/open-pr`, {
    method: "POST",
    body: JSON.stringify({})
  });
}
