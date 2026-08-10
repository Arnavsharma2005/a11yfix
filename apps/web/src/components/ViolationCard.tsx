import { ExternalLink, GitPullRequest, Wand2 } from "lucide-react";
import type { Violation } from "@a11yfix/shared-types";
import FixDiffViewer from "./FixDiffViewer";
import ScoreBadge from "./ScoreBadge";

interface ViolationCardProps {
  violation: Violation;
  isGenerating: boolean;
  onGenerate: (violationId: string) => void;
  error?: string | null;
}

const impactClass: Record<string, string> = {
  critical: "bg-rose-100 text-rose-800",
  serious: "bg-orange-100 text-orange-800",
  moderate: "bg-amber-100 text-amber-800",
  minor: "bg-sky-100 text-sky-800"
};

export default function ViolationCard({
  violation,
  isGenerating,
  onGenerate,
  error
}: ViolationCardProps) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <ScoreBadge score={violation.priorityScore} />
            <span className={`rounded-lg px-2 py-1 text-xs font-semibold uppercase ${impactClass[violation.impact]}`}>
              {violation.impact}
            </span>
            <span className="rounded-lg bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
              WCAG {violation.wcagCriteria}
            </span>
            <span className="rounded-lg bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
              {violation.ruleId}
            </span>
            {violation.prUrl ? (
              <a
                href={violation.prUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                <GitPullRequest className="h-3 w-3" aria-hidden="true" />
                View PR
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            ) : null}
          </div>
          <h2 className="text-base font-semibold text-zinc-950">{violation.description}</h2>
          <p className="break-all text-sm text-zinc-600">{violation.pageUrl}</p>
        </div>
        <button
          type="button"
          title="Generate fix"
          aria-label={`Generate code fix for ${violation.ruleId} violation`}
          disabled={isGenerating}
          onClick={() => onGenerate(violation.id)}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Wand2 className="h-4 w-4" aria-hidden="true" />
          {isGenerating ? "Generating" : violation.suggestedFix ? "Regenerate" : "Generate Fix"}
        </button>
      </div>

      {error ? (
        <p className="mt-2 text-xs font-medium text-rose-700">{error}</p>
      ) : null}

      <pre className="mt-4 max-h-48 overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
        {violation.htmlSnippet}
      </pre>

      {violation.suggestedFix ? (
        <div className="mt-4">
          <FixDiffViewer diff={violation.suggestedFix} />
        </div>
      ) : null}
    </article>
  );
}
