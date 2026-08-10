import { Router, type Router as ExpressRouter } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../db/client";
import { requireAuth } from "../middleware/auth";
import { assertCrawlableUrl } from "../security/url";
import { enqueueScan } from "../jobs/queues";
import { AppError, asyncHandler, notFound } from "../utils/errors";

const router: ExpressRouter = Router();

const createSiteSchema = z.object({
  url: z.string().url(),
  name: z.string().trim().min(1).max(120).optional()
});

const githubRepoSchema = z.object({
  githubRepo: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, "Expected owner/repo.")
});

const scanCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? "anonymous",
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: "RATE_LIMITED",
        message: "Scan creation is limited to 5 scans per hour."
      }
    });
  }
});

router.use(requireAuth);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createSiteSchema.parse(req.body);
    const url = await assertCrawlableUrl(body.url);

    const site = await prisma.site.create({
      data: {
        url: url.href,
        name: body.name ?? url.hostname,
        ownerUserId: req.user!.id
      }
    });

    res.status(201).json(site);
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const sites = await prisma.site.findMany({
      where: { ownerUserId: req.user!.id },
      orderBy: { createdAt: "desc" },
      include: {
        scans: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            violations: {
              select: {
                priorityScore: true
              }
            }
          }
        }
      }
    });

    const payload = sites.map(({ scans, ...site }) => ({
      ...site,
      recentScans: scans.map((scan) => {
        const totalViolations = scan.violations.length;
        const totalPriority = scan.violations.reduce((sum, violation) => sum + violation.priorityScore, 0);
        return {
          id: scan.id,
          status: scan.status,
          createdAt: scan.createdAt,
          completedAt: scan.completedAt,
          totalViolations,
          averagePriorityScore: totalViolations ? Math.round(totalPriority / totalViolations) : 0
        };
      })
    }));

    res.json(payload);
  })
);

router.post(
  "/:siteId/scans",
  scanCreateLimiter,
  asyncHandler(async (req, res) => {
    const site = await prisma.site.findFirst({
      where: {
        id: req.params.siteId,
        ownerUserId: req.user!.id
      }
    });

    if (!site) throw notFound("Site not found.");

    const scan = await prisma.scan.create({
      data: {
        siteId: site.id,
        status: "QUEUED"
      }
    });

    try {
      await enqueueScan(scan.id);
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

    res.status(202).json(scan);
  })
);

router.post(
  "/:siteId/github-connect",
  asyncHandler(async (req, res) => {
    const { githubRepo } = githubRepoSchema.parse(req.body);
    const site = await prisma.site.findFirst({
      where: {
        id: req.params.siteId,
        ownerUserId: req.user!.id
      }
    });

    if (!site) throw notFound("Site not found.");

    const updated = await prisma.site.update({
      where: { id: site.id },
      data: { githubRepo }
    });

    res.json(updated);
  })
);

router.use((err: unknown, _req: unknown, _res: unknown, next: (err: unknown) => void) => {
  if (err instanceof z.ZodError) {
    next(new AppError(400, "VALIDATION_ERROR", err.issues[0]?.message ?? "Invalid request body."));
    return;
  }

  next(err);
});

export default router;
