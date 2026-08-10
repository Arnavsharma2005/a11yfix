import { Queue } from "bullmq";
import IORedis from "ioredis";
import { config } from "../config";
import { AppError } from "../utils/errors";

export const SCAN_QUEUE_NAME = "a11yfix-scan";

export interface ScanJobData {
  scanId: string;
}

let redisConnection: IORedis | undefined;
let scanQueue: Queue<ScanJobData> | undefined;

export function getRedisConnection(): IORedis {
  if (!redisConnection) {
    redisConnection = new IORedis(config.redisUrl, {
      maxRetriesPerRequest: null
    });
  }

  return redisConnection;
}

export function getScanQueue(): Queue<ScanJobData> {
  if (!scanQueue) {
    scanQueue = new Queue<ScanJobData>(SCAN_QUEUE_NAME, {
      connection: getRedisConnection()
    });
  }

  return scanQueue;
}

export async function enqueueScan(scanId: string): Promise<void> {
  try {
    await getRedisConnection().ping();
    await getScanQueue().add(
      "scan",
      { scanId },
      {
        attempts: 2,
        backoff: {
          type: "exponential",
          delay: 5_000
        },
        removeOnComplete: 100,
        removeOnFail: 100
      }
    );
  } catch {
    throw new AppError(
      503,
      "SCAN_QUEUE_UNAVAILABLE",
      "Redis is unavailable, so the scan could not be queued. Start Redis and try again."
    );
  }
}
