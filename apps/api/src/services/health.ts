import { prisma } from "../db/client";
import { getRedisConnection } from "../jobs/queues";

export interface HealthCheck {
  ok: boolean;
  checks: {
    api: "ok";
    database: "ok" | "error";
    redis: "ok" | "error";
  };
}

export async function runHealthChecks(): Promise<HealthCheck> {
  const [database, redis] = await Promise.all([checkDatabase(), checkRedis()]);

  return {
    ok: database === "ok" && redis === "ok",
    checks: {
      api: "ok",
      database,
      redis
    }
  };
}

async function checkDatabase(): Promise<"ok" | "error"> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "ok";
  } catch {
    return "error";
  }
}

async function checkRedis(): Promise<"ok" | "error"> {
  try {
    await getRedisConnection().ping();
    return "ok";
  } catch {
    return "error";
  }
}
