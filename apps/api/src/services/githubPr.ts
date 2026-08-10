import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { Octokit } from "@octokit/rest";
import simpleGit from "simple-git";
import { prisma } from "../db/client";
import { decryptToken } from "../security/tokens";
import { generateFixForViolation } from "./fixGenerator";
import { AppError } from "../utils/errors";

const MAX_FIXES_PER_PR = 15;
const SOURCE_EXTENSIONS = new Set([".html", ".htm"]);
const IGNORED_DIRS = new Set([".git", "node_modules", "dist", "build", ".next", "coverage"]);

export async function openPullRequestsForScan(scanId: string, userId: string): Promise<string[]> {
  const scan = await prisma.scan.findFirst({
    where: {
      id: scanId,
      site: {
        ownerUserId: userId
      }
    },
    include: {
      site: {
        include: {
          owner: true
        }
      },
      violations: {
        where: {
          fixAvailable: true,
          status: "FIX_GENERATED"
        },
        orderBy: {
          priorityScore: "desc"
        }
      },
      pages: true
    }
  });

  if (!scan) {
    throw new AppError(404, "SCAN_NOT_FOUND", "Scan not found.");
  }

  if (!scan.site.githubRepo) {
    throw new AppError(400, "GITHUB_REPO_NOT_CONNECTED", "Connect a GitHub repo before opening a PR.");
  }

  if (scan.violations.length === 0) {
    throw new AppError(400, "NO_GENERATED_FIXES", "Generate at least one safe fix before opening a PR.");
  }

  const token = decryptToken(scan.site.owner.accessToken);
  const [owner, repo] = scan.site.githubRepo.split("/");
  const octokit = new Octokit({ auth: token });
  const { data: repoInfo } = await octokit.repos.get({ owner, repo });
  const defaultBranch = repoInfo.default_branch;
  const batches = chunk(scan.violations, MAX_FIXES_PER_PR);
  const prUrls: string[] = [];

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const prUrl = await openPullRequestBatch({
      owner,
      repo,
      token,
      octokit,
      defaultBranch,
      branchName: `a11yfix/scan-${scan.id}-${batchIndex + 1}`,
      scanId: scan.id,
      violations: batches[batchIndex],
      pages: scan.pages
    });

    prUrls.push(prUrl);
  }

  if (prUrls.length === 0) {
    throw new AppError(
      400,
      "NO_CONFIDENT_SOURCE_MATCHES",
      "No source files matched the generated safe fixes confidently enough to edit."
    );
  }

  return prUrls;
}

export async function openPullRequestForScan(scanId: string, userId: string): Promise<string> {
  const [firstPrUrl] = await openPullRequestsForScan(scanId, userId);
  return firstPrUrl;
}

type RepoViolation = {
  id: string;
  ruleId: string;
  pageUrl: string;
  selector: string;
  htmlSnippet: string;
  metadata: unknown;
};

type RepoPage = {
  pageUrl: string;
  rawHtml: string;
};

interface PullRequestBatchInput {
  owner: string;
  repo: string;
  token: string;
  octokit: Octokit;
  defaultBranch: string;
  branchName: string;
  scanId: string;
  violations: RepoViolation[];
  pages: RepoPage[];
}

async function openPullRequestBatch(input: PullRequestBatchInput): Promise<string> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "a11yfix-"));

  try {
    await simpleGit().clone(
      `https://x-access-token:${input.token}@github.com/${input.owner}/${input.repo}.git`,
      tempDir,
      ["--depth", "1", "--branch", input.defaultBranch]
    );

    const git = simpleGit(tempDir);
    await git.checkoutLocalBranch(input.branchName);

    const appliedViolationIds = await applyRepositoryFixes(tempDir, input.violations, input.pages);
    if (appliedViolationIds.length === 0) {
      throw new AppError(
        400,
        "NO_CONFIDENT_SOURCE_MATCHES",
        "No source files matched the generated safe fixes confidently enough to edit."
      );
    }

    const appliedViolations = input.violations.filter((violation) => appliedViolationIds.includes(violation.id));
    const ruleList = [...new Set(appliedViolations.map((violation) => violation.ruleId))].join(", ");

    await git.add(".");
    await git.commit(`fix(a11y): auto-fix ${appliedViolationIds.length} accessibility issues (${ruleList})`);
    await git.push("origin", input.branchName);

    const { data: pullRequest } = await input.octokit.pulls.create({
      owner: input.owner,
      repo: input.repo,
      title: `fix(a11y): auto-fix ${appliedViolationIds.length} accessibility issues`,
      head: input.branchName,
      base: input.defaultBranch,
      body: buildPullRequestBody(input.scanId, appliedViolations)
    });

    await prisma.violation.updateMany({
      where: {
        id: {
          in: appliedViolationIds
        }
      },
      data: {
        status: "PR_OPENED",
        prUrl: pullRequest.html_url
      }
    });

    return pullRequest.html_url;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function applyRepositoryFixes(
  repoRoot: string,
  violations: RepoViolation[],
  pages: RepoPage[]
): Promise<string[]> {
  const sourceFiles = await listSourceFiles(repoRoot);
  const appliedIds: string[] = [];

  for (const violation of violations) {
    const page = pages.find((candidate) => candidate.pageUrl === violation.pageUrl);
    const sourceFile = await findConfidentSourceFile(sourceFiles, violation);
    if (!sourceFile || !page) continue;

    const source = await readFile(sourceFile, "utf8");
    const result = generateFixForViolation({
      ruleId: violation.ruleId,
      selector: violation.selector,
      pageUrl: violation.pageUrl,
      pageHtml: source,
      htmlSnippet: violation.htmlSnippet,
      metadata: violation.metadata
    });

    if (!result.changed) continue;

    if (!result.fixedHtml || result.fixedHtml === source) continue;

    await writeFile(sourceFile, result.fixedHtml, "utf8");
    appliedIds.push(violation.id);
  }

  return appliedIds;
}

async function listSourceFiles(root: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await readdir(root, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        results.push(...(await listSourceFiles(fullPath)));
      }
      continue;
    }

    if (SOURCE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      results.push(fullPath);
    }
  }

  return results;
}

async function findConfidentSourceFile(files: string[], violation: RepoViolation): Promise<string | null> {
  const needle = stableNeedle(violation.htmlSnippet);
  const matches: string[] = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");
    if (needle && source.includes(needle)) {
      matches.push(file);
      continue;
    }

    if (violation.ruleId === "html-has-lang" && /<html(?:\s|>)/i.test(source)) {
      matches.push(file);
    }
  }

  return matches.length === 1 ? matches[0] : null;
}

function stableNeedle(htmlSnippet: string): string | null {
  const normalized = htmlSnippet.replace(/\s+/g, " ").trim();
  if (normalized.length < 12) return null;
  return normalized.slice(0, Math.min(120, normalized.length));
}

function buildPullRequestBody(scanId: string, violations: RepoViolation[]): string {
  const lines = [
    `A11yFix generated safe accessibility fixes for scan ${scanId}.`,
    "",
    "Applied fixes:",
    ...violations.map(
      (violation) =>
        `- ${violation.ruleId} on ${violation.pageUrl} (${violation.selector || "selector unavailable"})`
    ),
    "",
    "Note: html-has-lang uses lang=\"en\" as a safe default assumption. Please correct it if this site is not English-primary."
  ];

  return lines.join("\n");
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
