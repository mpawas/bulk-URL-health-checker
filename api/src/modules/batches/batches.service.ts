import type { PersistedBatch } from "./batches.repository.js";
import { BatchesRepository } from "./batches.repository.js";

export class BatchesService {
  constructor(private readonly repository: BatchesRepository) {}

  createFromUrlList(urls: string[]): Promise<PersistedBatch> {
    return this.repository.createWithUrls(urls);
  }
}
