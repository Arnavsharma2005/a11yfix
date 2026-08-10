export type ScanStatus = "QUEUED" | "CRAWLING" | "SCANNING" | "COMPLETED" | "FAILED";

export type ViolationStatus = "OPEN" | "FIX_GENERATED" | "PR_OPENED" | "RESOLVED" | "IGNORED";

export type AxeImpact = "critical" | "serious" | "moderate" | "minor";

export interface Site {
  id: string;
  url: string;
  name: string | null;
  githubRepo: string | null;
  ownerUserId: string;
  createdAt: string;
}

export interface Scan {
  id: string;
  siteId: string;
  status: ScanStatus;
  pagesScanned: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface Violation {
  id: string;
  scanId: string;
  pageUrl: string;
  ruleId: string;
  wcagCriteria: string;
  impact: AxeImpact;
  selector: string;
  htmlSnippet: string;
  description: string;
  priorityScore: number;
  fixAvailable: boolean;
  suggestedFix: string | null;
  status: ViolationStatus;
  prUrl?: string | null;
}

export interface ScanWithViolations extends Scan {
  violations: Violation[];
}

export interface ScanStatusResponse {
  status: ScanStatus;
  pagesScanned: number;
}

export interface ScanSummary {
  id: string;
  status: ScanStatus;
  createdAt: string;
  completedAt: string | null;
  totalViolations: number;
  averagePriorityScore: number;
}

export interface SiteSummary extends Site {
  recentScans: ScanSummary[];
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}
