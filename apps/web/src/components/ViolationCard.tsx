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
  critical: "bg-rose-50 text-rose-700 border-rose-200",
  serious: "bg-orange-50 text-orange-700 border-orange-200",
  moderate: "bg-amber-50 text-amber-700 border-amber-200",
  minor: "bg-sky-50 text-sky-700 border-sky-200"
};

export default function ViolationCard({
  violation,
  isGenerating,
  onGenerate,
  error
}: ViolationCardProps) {
  return (
    <article className="rounded-lg border border-hairline bg-surface p-5 shadow-sm transition-colors hover:border-slate/40">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <ScoreBadge score={violation.priorityScore} />
            <span className={`rounded-lg border px-2 py-0.5 font-mono text-xs font-semibold uppercase ${impactClass[violation.impact]}`}>
              {violation.impact}
            </span>
            <span className="rounded-lg border border-hairline bg-canvas px-2 py-0.5 font-mono text-xs font-medium text-slate">
              WCAG {violation.wcagCriteria}
            </span>
            <span className="rounded-lg border border-hairline bg-canvas px-2 py-0.5 font-mono text-xs font-medium text-slate">
              {violation.ruleId}
            </span>
            {violation.prUrl ? (
              <a
                href={violation.prUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2 py-0.5 font-mono text-xs font-semibold text-teal-800 hover:bg-teal-100"
              >
                <GitPullRequest className="h-3 w-3" aria-hidden="true" />
                View PR
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            ) : null}
          </div>
          <h2 className="text-base font-semibold text-ink">{violation.description}</h2>
          <p className="break-all font-mono text-xs text-slate">{violation.pageUrl}</p>
        </div>
        <button
          type="button"
          title="Generate fix"
          aria-label={`Generate code fix for ${violation.ruleId} violation`}
          disabled={isGenerating}
          onClick={() => onGenerate(violation.id)}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-ink px-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Wand2 className="h-4 w-4" aria-hidden="true" />
          {isGenerating ? "Generating" : violation.suggestedFix ? "Regenerate" : "Generate Fix"}
        </button>
      </div>

      {error ? (
        <p className="mt-2 text-xs font-medium text-rose-700">{error}</p>
      ) : null}

      <pre className="mt-4 max-h-48 overflow-auto rounded-lg border border-hairline bg-canvas p-3 font-mono text-xs text-ink">
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
