import type IORedis from "ioredis";
import type { BatchEvent } from "@url-checker/shared";
import type { PersistedBatch } from "./batches.repository.js";
import { BatchesRepository } from "./batches.repository.js";
import type { EnqueueFailure } from "./batches.queue.js";
import { BatchesQueue } from "./batches.queue.js";
import { publishBatchUpdate } from "./batches.publisher.js";

export type CreatedBatch = PersistedBatch & {
  enqueueFailures: EnqueueFailure[];
};

export type CancelResult =
  | { status: "not_found" }
  | { status: "completed" }
  | { status: "cancelled"; event: BatchEvent };

export class BatchesService {
  constructor(
    private readonly repository: BatchesRepository,
    private readonly queue: BatchesQueue,
    private readonly redis: IORedis,
  ) {}

  /**
   * Persist every URL first, then enqueue. Enqueue errors are surfaced
   * and never roll back the committed rows.
   */
  async createFromUrlList(urls: string[]): Promise<CreatedBatch> {
    const batch = await this.repository.createWithUrls(urls);
    const enqueueFailures = await this.queue.enqueueUrlChecks(batch);
    return { ...batch, enqueueFailures };
  }

  async cancel(batchId: string): Promise<CancelResult> {
    const result = await this.repository.cancel(batchId);
    if (result.status === "not_found" || result.status === "completed") {
      return result;
    }

    await this.queue.removeJobs(result.removedJobIds);
    const event = await publishBatchUpdate(
      this.redis,
      this.repository,
      batchId,
    );
    if (!event) {
      return { status: "not_found" };
    }
    return { status: "cancelled", event };
  }
}
