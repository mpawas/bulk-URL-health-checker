import type IORedis from "ioredis";
import {
  BatchListResponseSchema,
  type BatchEvent,
  type BatchListResponse,
} from "@url-checker/shared";
import type { PersistedBatch } from "./batches.repository.js";
import { BatchesRepository } from "./batches.repository.js";
import type { EnqueueFailure } from "@url-checker/shared";
import { BatchesQueue } from "./batches.queue.js";
import { publishBatchUpdate } from "./batches.publisher.js";
import { readBatchListCache, writeBatchListCache, invalidateBatchListCache } from "./batches.cache.js";
import { toBatch } from "./batches.serialize.js";

export type CreatedBatch = PersistedBatch & {
  enqueueFailures: EnqueueFailure[];
};

export type CancelResult =
  | { status: "not_found" }
  | { status: "completed" }
  | { status: "cancelled"; event: BatchEvent };

export type RetryFailedResult =
  | { status: "not_found" }
  | { status: "cancelled" }
  | { status: "none"; event: BatchEvent }
  | { status: "queued"; event: BatchEvent; enqueueFailures: EnqueueFailure[] };

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
  async list(): Promise<BatchListResponse> {
    const cached = await readBatchListCache(this.redis);
    if (cached) {
      return cached;
    }

    const rows = await this.repository.list();
    const payload = BatchListResponseSchema.parse({
      batches: rows.map((row) => toBatch(row)),
    });
    await writeBatchListCache(this.redis, payload);
    return payload;
  }

  async createFromUrlList(urls: string[]): Promise<CreatedBatch> {
    const batch = await this.repository.createWithUrls(urls);
    const enqueueFailures = await this.queue.enqueueUrlChecks(batch);
    await invalidateBatchListCache(this.redis);
    console.log(
      `[batches] created     id=${batch.batchId.slice(0, 8)}  urls=${batch.totalUrls}` +
        (enqueueFailures.length > 0
          ? `  enqueue_failures=${enqueueFailures.length}`
          : ""),
    );
    return { ...batch, enqueueFailures };
  }

  async cancel(batchId: string): Promise<CancelResult> {
    const result = await this.repository.cancel(batchId);
    if (result.status === "not_found" || result.status === "completed") {
      return result;
    }

    await this.queue.removeJobs(result.removedJobIds);
    await invalidateBatchListCache(this.redis);
    console.log(
      `[batches] cancelled   id=${batchId.slice(0, 8)}  dropped_jobs=${result.removedJobIds.length}`,
    );
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

  async retryFailed(batchId: string): Promise<RetryFailedResult> {
    const result = await this.repository.retryFailed(batchId);
    if (result.status === "not_found" || result.status === "cancelled") {
      return result;
    }

    let enqueueFailures: EnqueueFailure[] = [];
    if (result.status === "queued") {
      enqueueFailures = await this.queue.enqueueUrlChecks(result.batch);
    }

    await invalidateBatchListCache(this.redis);
    const event = await publishBatchUpdate(
      this.redis,
      this.repository,
      batchId,
    );
    if (!event) {
      return { status: "not_found" };
    }
    if (result.status === "none") {
      console.log(
        `[batches] retry-failed id=${batchId.slice(0, 8)}  none (no failed urls)`,
      );
      return { status: "none", event };
    }
    console.log(
      `[batches] retry-failed id=${batchId.slice(0, 8)}  requeued=${result.batch.urls.length}` +
        (enqueueFailures.length > 0
          ? `  enqueue_failures=${enqueueFailures.length}`
          : ""),
    );
    return { status: "queued", event, enqueueFailures };
  }
}
