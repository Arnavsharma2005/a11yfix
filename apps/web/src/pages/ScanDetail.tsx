import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import type { ScanWithViolations } from "@a11yfix/shared-types";
import { generateFix, getScan } from "../api/client";
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

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Scan Detail</h1>
          <p className="text-sm text-zinc-600">{scan.id}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white">{scan.status}</span>
          <span className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700">
            {scan.pagesScanned} pages
          </span>
        </div>
      </div>

      {ACTIVE_STATUSES.has(scan.status) ? (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm font-medium text-sky-800">
          <RefreshCcw className="h-4 w-4 animate-spin" aria-hidden="true" />
          Scan is running.
        </div>
      ) : null}

      {scan.status === "FAILED" ? (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          Scan failed.
        </div>
      ) : null}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Violations</h2>
        <span className="text-sm text-zinc-600">{scan.violations.length} found</span>
      </div>

      <div className="space-y-4">
        {scan.violations.map((violation) => (
          <ViolationCard
            key={violation.id}
            violation={violation}
            isGenerating={fixMutation.isPending && fixMutation.variables === violation.id}
            onGenerate={(violationId) => fixMutation.mutate(violationId)}
          />
        ))}
      </div>
    </section>
  );
}
