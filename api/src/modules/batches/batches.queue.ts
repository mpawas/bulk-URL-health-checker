import { Queue } from "bullmq";
import IORedis from "ioredis";
import type { UrlCheckJobData } from "@url-checker/shared";
import type { PersistedBatch } from "./batches.repository.js";

export type EnqueueFailure = {
  batchUrlId: string;
  url: string;
  message: string;
};

export class BatchesQueue {
  private readonly queue: Queue<UrlCheckJobData>;

  constructor() {
    const connection = new IORedis(
      process.env.REDIS_URL ?? "redis://localhost:6379",
      { maxRetriesPerRequest: null },
    );
    this.queue = new Queue("url-check", { connection });
  }

  /**
   * Enqueues one job per persisted URL. Failures are logged and returned;
   * they never roll back the batch rows already committed.
   */
  async enqueueUrlChecks(batch: PersistedBatch): Promise<EnqueueFailure[]> {
    const failures: EnqueueFailure[] = [];

    for (const row of batch.urls) {
      const data: UrlCheckJobData = {
        batchUrlId: row.id,
        batchId: batch.batchId,
        url: row.url,
      };

      try {
        await this.queue.add("check", data, {
          jobId: row.id,
          attempts: 3,
          backoff: { type: "exponential", delay: 1000 },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("failed to enqueue url-check job", {
          batchId: batch.batchId,
          batchUrlId: row.id,
          url: row.url,
          message,
        });
        failures.push({ batchUrlId: row.id, url: row.url, message });
      }
    }

    return failures;
  }
}
