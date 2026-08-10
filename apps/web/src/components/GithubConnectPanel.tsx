import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, GitBranch, GitPullRequest } from "lucide-react";
import { githubConnect, openPr } from "../api/client";

interface GithubConnectPanelProps {
  siteId: string;
  githubRepo: string | null;
  scanId: string;
  hasGeneratedFixes: boolean;
}

const REPO_REGEX = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export default function GithubConnectPanel({
  siteId,
  githubRepo,
  scanId,
  hasGeneratedFixes
}: GithubConnectPanelProps) {
  const queryClient = useQueryClient();
  const [repoInput, setRepoInput] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [openedPrUrl, setOpenedPrUrl] = useState<string | null>(null);

  const connectMutation = useMutation({
    mutationFn: (repo: string) => githubConnect(siteId, repo),
    onSuccess: () => {
      setValidationError(null);
      queryClient.invalidateQueries({ queryKey: ["scan", scanId] });
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    }
  });

  const openPrMutation = useMutation({
    mutationFn: () => openPr(scanId),
    onSuccess: (data) => {
      setOpenedPrUrl(data.prUrl || data.prUrls?.[0] || null);
      queryClient.invalidateQueries({ queryKey: ["scan", scanId] });
    }
  });

  function handleConnectSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = repoInput.trim();
    if (!REPO_REGEX.test(trimmed)) {
      setValidationError("Repository must be in owner/repo format (e.g. acme/website).");
      return;
    }
    setValidationError(null);
    connectMutation.mutate(trimmed);
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-zinc-700" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-zinc-900">GitHub PR Automation</h3>
          </div>
          <p className="text-xs text-zinc-600">
            {githubRepo
              ? `Connected repository: ${githubRepo}`
              : "Connect your GitHub repository to automatically create pull requests for generated fixes."}
          </p>
        </div>

        {githubRepo ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-800">
              <GitBranch className="h-3.5 w-3.5 text-zinc-600" aria-hidden="true" />
              {githubRepo}
            </span>
            <button
              type="button"
              disabled={!hasGeneratedFixes || openPrMutation.isPending}
              onClick={() => openPrMutation.mutate()}
              title={
                !hasGeneratedFixes
                  ? "Generate at least one fix first to open a pull request"
                  : "Open GitHub Pull Request with generated fixes"
              }
              aria-label="Open GitHub Pull Request with generated fixes"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <GitPullRequest className="h-4 w-4" aria-hidden="true" />
              {openPrMutation.isPending ? "Opening PR..." : "Open Pull Request"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleConnectSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              placeholder="owner/repository"
              aria-label="GitHub repository in owner/repo format"
              className="h-9 rounded-lg border border-zinc-300 px-3 text-xs outline-none ring-emerald-500 focus:ring-2"
            />
            <button
              type="submit"
              disabled={connectMutation.isPending}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-zinc-900 px-3 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {connectMutation.isPending ? "Connecting..." : "Connect Repo"}
            </button>
          </form>
        )}
      </div>

      {validationError ? (
        <p className="mt-2 text-xs font-medium text-rose-700">{validationError}</p>
      ) : null}

      {connectMutation.error ? (
        <p className="mt-2 text-xs font-medium text-rose-700">{connectMutation.error.message}</p>
      ) : null}

      {openPrMutation.error ? (
        <p className="mt-2 text-xs font-medium text-rose-700">{openPrMutation.error.message}</p>
      ) : null}

      {openedPrUrl ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-900">
          <GitPullRequest className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          <span>Pull Request created:</span>
          <a
            href={openedPrUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold underline hover:text-emerald-700"
          >
            {openedPrUrl}
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </div>
      ) : null}
    </div>
  );
}
