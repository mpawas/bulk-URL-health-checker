import type { Job } from "bullmq";
import IORedis from "ioredis";
import { UrlCheckJobDataSchema } from "@url-checker/shared";
import { prisma } from "../../prisma.js";
import { fetchUrl } from "./fetch-url.js";
import { parsePageTitle } from "./parse-title.js";
import {
  URL_CHECK_MAX_ATTEMPTS,
  URL_CHECK_QUEUE,
} from "./url-check.config.js";
import { failureForStatus, isTransientStatus } from "./url-check.errors.js";
import { UrlCheckRepository } from "./url-check.repository.js";
import { publishBatchUpdate } from "./url-check.publisher.js";

const rateRedis = new IORedis(
  process.env.REDIS_URL ?? "redis://localhost:6379",
  { maxRetriesPerRequest: null },
);

const repository = new UrlCheckRepository(prisma);

async function recordCheckStart(): Promise<void> {
  const windowKey = `${URL_CHECK_QUEUE}:starts:${Math.floor(Date.now() / 1000)}`;
  await rateRedis.incr(windowKey);
  await rateRedis.expire(windowKey, 30);
}

export async function processUrlCheck(job: Job): Promise<void> {
  const data = UrlCheckJobDataSchema.parse(job.data);
  const attemptCount = job.attemptsMade + 1;

  const claimed = await repository.tryMarkChecking(
    data.batchUrlId,
    attemptCount,
  );
  if (!claimed) {
    console.log("skipping stale job; row already completed or cancelled", {
      batchUrlId: data.batchUrlId,
    });
    return;
  }

  await recordCheckStart();
  const fetched = await fetchUrl(data.url);
  const pageTitle =
    fetched.body !== null ? parsePageTitle(fetched.body) : null;
  const maxAttempts = job.opts.attempts ?? URL_CHECK_MAX_ATTEMPTS;
  const lastAttempt = attemptCount >= maxAttempts;

  if (fetched.networkError) {
    if (!lastAttempt) {
      throw new Error(`network error fetching ${data.url}`);
    }
    await persistOutcome(data.batchUrlId, data.batchId, {
      status: "failed",
      statusCode: null,
      responseTimeMs: fetched.responseTimeMs,
      pageTitle,
    });
    return;
  }

  const statusCode = fetched.statusCode ?? 0;

  if (isTransientStatus(statusCode) && !lastAttempt) {
    throw failureForStatus(statusCode);
  }

  const ok = statusCode >= 200 && statusCode < 400;
  await persistOutcome(data.batchUrlId, data.batchId, {
    status: ok ? "completed" : "failed",
    statusCode: fetched.statusCode,
    responseTimeMs: fetched.responseTimeMs,
    pageTitle,
  });

  if (statusCode >= 400 && statusCode < 500) {
    throw failureForStatus(statusCode);
  }
}

async function persistOutcome(
  id: string,
  batchId: string,
  result: {
    status: "completed" | "failed";
    statusCode: number | null;
    responseTimeMs: number | null;
    pageTitle: string | null;
  },
): Promise<void> {
  const written = await repository.writeResult({ id, ...result });
  if (!written) {
    console.log("skipping stale overwrite; row is no longer checking", { id });
    return;
  }
  await repository.refreshBatch(batchId);
  await publishBatchUpdate(repository, batchId);
}
