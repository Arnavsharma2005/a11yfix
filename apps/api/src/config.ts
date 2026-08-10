import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config();

function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) return fallback;
  return parsed;
}

function readBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw === "true" || raw === "1";
}

export const config = {
  port: readInt("PORT", 4000),
  databaseUrl: process.env.DATABASE_URL ?? "",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  webUrl: process.env.WEB_URL ?? "http://localhost:5173",
  sessionSecret: process.env.SESSION_SECRET ?? "local-dev-session-secret-change-me",
  githubClientId: process.env.GITHUB_CLIENT_ID ?? "",
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
  tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY ?? "",
  maxPagesPerScan: readInt("MAX_PAGES_PER_SCAN", 25),
  pageTimeoutMs: readInt("PAGE_TIMEOUT_MS", 15_000),
  devBypassAuth: readBool("DEV_BYPASS_AUTH", process.env.NODE_ENV !== "production"),
  runWorkerInApi: readBool("RUN_WORKER_IN_API", true),
  puppeteerNoSandbox:
    readBool("PUPPETEER_NO_SANDBOX", false) ||
    process.env.CI === "true" ||
    Boolean(process.env.RENDER || process.env.RAILWAY_ENVIRONMENT)
};
