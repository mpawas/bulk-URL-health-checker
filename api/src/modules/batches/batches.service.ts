import type { PersistedBatch } from "./batches.repository.js";
import { BatchesRepository } from "./batches.repository.js";

export class BatchesService {
  constructor(private readonly repository: BatchesRepository) {}

  /**
   * Persist the batch and every URL row first. Queue work belongs in a
   * later step so an enqueue failure cannot drop DB rows.
   */
  async createFromUrlList(urls: string[]): Promise<PersistedBatch> {
    return this.repository.createWithUrls(urls);
  }
}
