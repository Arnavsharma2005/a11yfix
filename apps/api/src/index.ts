import cors from "cors";
import express, { type RequestHandler } from "express";
import session from "express-session";
import morgan from "morgan";
import { config } from "./config";
import authRoutes from "./routes/auth";
import githubRoutes from "./routes/github";
import scanRoutes from "./routes/scans";
import siteRoutes from "./routes/sites";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { createScanWorker } from "./jobs/scan.worker";
import { runHealthChecks } from "./services/health";

export function createApp(): express.Express {
  const app = express();

  app.set("trust proxy", 1);
  app.use(
    cors({
      origin: config.webUrl,
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));
  app.use(
    session({
      name: "a11yfix.sid",
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production"
      }
    }) as RequestHandler
  );

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/health/deep", async (_req, res, next) => {
    try {
      const health = await runHealthChecks();
      res.status(health.ok ? 200 : 503).json(health);
    } catch (error) {
      next(error);
    }
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/github", githubRoutes);
  app.use("/api/sites", siteRoutes);
  app.use("/api/scans", scanRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

if (require.main === module) {
  const app = createApp();

  if (config.runWorkerInApi) {
    createScanWorker();
  }

  app.listen(config.port, () => {
    console.log(`A11yFix API listening on http://localhost:${config.port}`);
  });
}
