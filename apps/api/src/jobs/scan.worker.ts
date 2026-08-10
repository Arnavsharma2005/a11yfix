import { Worker } from "bullmq";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db/client";
import { config } from "../config";
import { crawlAndScan } from "../services/crawler";
import { isAutoFixableRule } from "../services/fixGenerator";
import { computePriorityScore } from "../services/prioritizer";
import { getRedisConnection, SCAN_QUEUE_NAME, type ScanJobData } from "./queues";

export async function processScanJob(scanId: string): Promise<void> {
  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: { site: true }
  });

  if (!scan) return;

  await prisma.scan.update({
    where: { id: scan.id },
    data: {
      status: "CRAWLING",
      startedAt: new Date()
    }
  });

  try {
    const pages = await crawlAndScan(scan.site.url, {
      maxPages: config.maxPagesPerScan,
      pageTimeoutMs: config.pageTimeoutMs,
      onPageComplete: async (pagesScanned) => {
        await prisma.scan.update({
          where: { id: scan.id },
          data: { pagesScanned }
        });
      }
    });

    await prisma.scan.update({
      where: { id: scan.id },
      data: {
        status: "SCANNING",
        pagesScanned: pages.length
      }
    });

    const rawViolations = pages.flatMap((page) => page.violations);
    const totalViolations = rawViolations.length;
    const ruleCounts = new Map<string, number>();

    for (const violation of rawViolations) {
      ruleCounts.set(violation.ruleId, (ruleCounts.get(violation.ruleId) ?? 0) + 1);
    }

    await prisma.$transaction(async (tx: any) => {
      for (const page of pages) {
        await tx.scannedPage.create({
          data: {
            scanId: scan.id,
            pageUrl: page.url,
            title: page.title,
            rawHtml: page.rawHtml
          }
        });
      }

      for (const violation of rawViolations) {
        const priority = computePriorityScore({
          siteUrl: scan.site.url,
          pageUrl: violation.pageUrl,
          impact: violation.impact,
          ruleId: violation.ruleId,
          htmlSnippet: violation.htmlSnippet,
          ruleOccurrences: ruleCounts.get(violation.ruleId) ?? 0,
          totalViolations
        });

        await tx.violation.create({
          data: {
            scanId: scan.id,
            pageUrl: violation.pageUrl,
            ruleId: violation.ruleId,
            wcagCriteria: violation.wcagCriteria,
            impact: violation.impact,
            selector: violation.selector,
            htmlSnippet: violation.htmlSnippet,
            description: violation.description,
            priorityScore: priority.priorityScore,
            fixAvailable: isAutoFixableRule(violation.ruleId),
            metadata: (violation.metadata ?? {}) as any
          }
        });
      }

      await tx.scan.update({
        where: { id: scan.id },
        data: {
          status: "COMPLETED",
          pagesScanned: pages.length,
          completedAt: new Date()
        }
      });
    });
  } catch (error) {
    await prisma.scan.update({
      where: { id: scan.id },
      data: {
        status: "FAILED",
        completedAt: new Date()
      }
    });

    throw error;
  }
}

export function createScanWorker(): Worker<ScanJobData> {
  const worker = new Worker<ScanJobData>(
    SCAN_QUEUE_NAME,
    async (job) => {
      await processScanJob(job.data.scanId);
    },
    {
      connection: getRedisConnection(),
      concurrency: 2
    }
  );

  worker.on("failed", (job, error) => {
    console.error(`Scan job ${job?.id ?? "unknown"} failed`, error);
  });

  return worker;
}

if (require.main === module) {
  createScanWorker();
  console.log("A11yFix scan worker started");
}
