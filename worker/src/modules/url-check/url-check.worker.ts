import { UnrecoverableError, Worker } from "bullmq";
import IORedis from "ioredis";
import {
  URL_CHECK_BACKOFF_DELAY_MS,
  URL_CHECK_CONCURRENCY,
  URL_CHECK_QUEUE,
  URL_CHECK_RATE_LIMIT,
} from "./url-check.config.js";
import { logCheck } from "./url-check.log.js";
import { processUrlCheck } from "./url-check.processor.js";

const connection = new IORedis(
  process.env.REDIS_URL ?? "redis://localhost:6379",
  { maxRetriesPerRequest: null },
);

export function startUrlCheckWorker(): Worker {
  const worker = new Worker(URL_CHECK_QUEUE, processUrlCheck, {
    connection,
    concurrency: URL_CHECK_CONCURRENCY,
    limiter: {
      max: URL_CHECK_RATE_LIMIT.max,
      duration: URL_CHECK_RATE_LIMIT.duration,
    },
    settings: {
      backoffStrategy: (attemptsMade: number) =>
        URL_CHECK_BACKOFF_DELAY_MS * 2 ** attemptsMade,
    },
  });

  worker.on("ready", () =>
    console.log("[url-check] ready     waiting for jobs"),
  );
  worker.on("failed", (job, err) => {
    // 4xx throws UnrecoverableError after the row is already stored as failed.
    if (err instanceof UnrecoverableError) {
      return;
    }
    const maxAttempts = job?.opts.attempts ?? 3;
    const attempt = job?.attemptsMade ?? 0;
    if (attempt >= maxAttempts) {
      logCheck("failed", {
        url: typeof job?.data?.url === "string" ? job.data.url : undefined,
        attempt,
        maxAttempts,
        reason: err.message,
      });
    }
  });

  return worker;
}
