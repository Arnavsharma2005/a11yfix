import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "../db/client";
import { requireAuth } from "../middleware/auth";
import { generateFixForViolation } from "../services/fixGenerator";
import { openPullRequestsForScan } from "../services/githubPr";
import { impactWeightFor } from "../services/prioritizer";
import { asyncHandler, notFound } from "../utils/errors";

const router: ExpressRouter = Router();

router.use(requireAuth);

router.get(
  "/:scanId",
  asyncHandler(async (req, res) => {
    const scan = await prisma.scan.findFirst({
      where: {
        id: req.params.scanId,
        site: {
          ownerUserId: req.user!.id
        }
      },
      include: {
        violations: true
      }
    });

    if (!scan) throw notFound("Scan not found.");

    scan.violations.sort((a, b) => {
      const scoreDelta = b.priorityScore - a.priorityScore;
      if (scoreDelta !== 0) return scoreDelta;

      const impactDelta = impactWeightFor(b.impact) - impactWeightFor(a.impact);
      if (impactDelta !== 0) return impactDelta;

      return a.pageUrl.localeCompare(b.pageUrl);
    });

    res.json(scan);
  })
);

router.get(
  "/:scanId/status",
  asyncHandler(async (req, res) => {
    const scan = await prisma.scan.findFirst({
      where: {
        id: req.params.scanId,
        site: {
          ownerUserId: req.user!.id
        }
      },
      select: {
        status: true,
        pagesScanned: true
      }
    });

    if (!scan) throw notFound("Scan not found.");
    res.json(scan);
  })
);

router.post(
  "/:scanId/violations/:violationId/generate-fix",
  asyncHandler(async (req, res) => {
    const violation = await prisma.violation.findFirst({
      where: {
        id: req.params.violationId,
        scanId: req.params.scanId,
        scan: {
          site: {
            ownerUserId: req.user!.id
          }
        }
      }
    });

    if (!violation) throw notFound("Violation not found.");

    const page = await prisma.scannedPage.findFirst({
      where: {
        scanId: req.params.scanId,
        pageUrl: violation.pageUrl
      }
    });

    const result = generateFixForViolation({
      ruleId: violation.ruleId,
      selector: violation.selector,
      pageUrl: violation.pageUrl,
      pageHtml: page?.rawHtml ?? violation.htmlSnippet,
      htmlSnippet: violation.htmlSnippet,
      metadata: violation.metadata
    });

    const updated = await prisma.violation.update({
      where: { id: violation.id },
      data: {
        fixAvailable: result.fixAvailable,
        suggestedFix: result.suggestedFix,
        status: result.fixAvailable && result.changed ? "FIX_GENERATED" : violation.status
      }
    });

    res.json(updated);
  })
);

router.post(
  "/:scanId/open-pr",
  asyncHandler(async (req, res) => {
    const prUrls = await openPullRequestsForScan(req.params.scanId, req.user!.id);
    res.json({ prUrl: prUrls[0], prUrls });
  })
);

export default router;
