import type { Scan, ScanStatusResponse, ScanWithViolations, Site, SiteSummary, Violation } from "@a11yfix/shared-types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...init.headers
    },
    ...init
  });

  const body = await response.json().catch(() => undefined);
  if (!response.ok) {
    const message = body?.error?.message ?? "Request failed.";
    throw new Error(message);
  }

  return body as T;
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
