import type { Batch as PrismaBatch, BatchUrl as PrismaBatchUrl } from "@prisma/client";
import { BatchEventSchema, BatchSchema } from "@url-checker/shared";
import type { Batch, BatchEvent } from "@url-checker/shared";

export function toBatch(batch: PrismaBatch): Batch {
  return BatchSchema.parse({
    id: batch.id,
    status: batch.status,
    totalUrls: batch.totalUrls,
    completedCount: batch.completedCount,
    failedCount: batch.failedCount,
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
  });
}

export function toBatchEvent(
  type: BatchEvent["type"],
  batch: PrismaBatch,
  urls: PrismaBatchUrl[],
): BatchEvent {
  return BatchEventSchema.parse({
    type,
    batch: toBatch(batch),
    urls: urls.map((row) => ({
      id: row.id,
      batchId: row.batchId,
      url: row.url,
      status: row.status,
      statusCode: row.statusCode,
      responseTimeMs: row.responseTimeMs,
      pageTitle: row.pageTitle,
      attemptCount: row.attemptCount,
      updatedAt: row.updatedAt.toISOString(),
    })),
  });
}
