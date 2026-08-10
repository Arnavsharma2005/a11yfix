import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle, RefreshCcw } from "lucide-react";
import type { ScanWithViolations, Violation } from "@a11yfix/shared-types";
import { generateFix, getScan } from "../api/client";
import GithubConnectPanel from "../components/GithubConnectPanel";
import ViolationCard from "../components/ViolationCard";

const ACTIVE_STATUSES = new Set(["QUEUED", "CRAWLING", "SCANNING"]);

export default function ScanDetail() {
  const { scanId } = useParams<{ scanId: string }>();
  const queryClient = useQueryClient();

  const scanQuery = useQuery({
    queryKey: ["scan", scanId],
    queryFn: () => getScan(scanId!),
    enabled: Boolean(scanId),
    refetchInterval: (query) => {
      const data = query.state.data as ScanWithViolations | undefined;
      return data && ACTIVE_STATUSES.has(data.status) ? 2000 : false;
    }
  });

  const fixMutation = useMutation({
    mutationFn: (violationId: string) => generateFix(scanId!, violationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["scan", scanId] });
    }
  });

  if (scanQuery.isLoading) return <p className="text-sm text-zinc-600">Loading scan...</p>;
  if (scanQuery.error) return <p className="text-sm font-medium text-rose-700">{scanQuery.error.message}</p>;

  const scan = scanQuery.data;
  if (!scan) return null;

  const hasGeneratedFixes = scan.violations.some((v) => v.status === "FIX_GENERATED" || v.status === "PR_OPENED");

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Scan Detail</h1>
          <p className="text-sm text-zinc-600">Scan ID: {scan.id}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white">{scan.status}</span>
          <span className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700">
            {scan.pagesScanned} pages scanned
          </span>
        </div>
      </div>

      {ACTIVE_STATUSES.has(scan.status) ? (
        <div className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm font-medium text-sky-800">
          <RefreshCcw className="h-4 w-4 animate-spin" aria-hidden="true" />
          Scan in progress... Polling active results.
        </div>
      ) : null}

      {scan.status === "FAILED" ? (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          Scan execution failed.
        </div>
      ) : null}

      {scan.status === "COMPLETED" && scan.site ? (
        <GithubConnectPanel
          siteId={scan.site.id || scan.siteId}
          githubRepo={scan.site.githubRepo ?? null}
          scanId={scan.id}
          hasGeneratedFixes={hasGeneratedFixes}
        />
      ) : null}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-950">Violations</h2>
          <span className="text-sm font-medium text-zinc-600">{scan.violations.length} found</span>
        </div>

        {scan.status === "COMPLETED" && scan.violations.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900 shadow-sm">
            <CheckCircle className="h-6 w-6 shrink-0 text-emerald-600" aria-hidden="true" />
            <div>
              <h3 className="font-semibold">No WCAG Violations Found</h3>
              <p className="text-sm text-emerald-700">
                Great news! No accessibility violations were detected across {scan.pagesScanned} scanned pages.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {scan.violations.map((violation: Violation) => (
              <ViolationCard
                key={violation.id}
                violation={violation}
                isGenerating={fixMutation.isPending && fixMutation.variables === violation.id}
                onGenerate={(violationId) => fixMutation.mutate(violationId)}
                error={fixMutation.error && fixMutation.variables === violation.id ? fixMutation.error.message : null}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
