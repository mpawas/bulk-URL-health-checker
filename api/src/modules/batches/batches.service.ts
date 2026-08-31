import type { PersistedBatch } from "./batches.repository.js";
import { BatchesRepository } from "./batches.repository.js";
import type { EnqueueFailure } from "./batches.queue.js";
import { BatchesQueue } from "./batches.queue.js";

export type CreatedBatch = PersistedBatch & {
  enqueueFailures: EnqueueFailure[];
};

export class BatchesService {
  constructor(
    private readonly repository: BatchesRepository,
    private readonly queue: BatchesQueue,
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
}
