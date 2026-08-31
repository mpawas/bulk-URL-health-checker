import type { Batch, BatchUrl } from "@prisma/client";
import { BatchEventSchema } from "@url-checker/shared";
import type { BatchEvent } from "@url-checker/shared";

export function toBatchEvent(
  type: BatchEvent["type"],
  batch: Batch,
  urls: BatchUrl[],
): BatchEvent {
  return BatchEventSchema.parse({
    type,
    batch: {
      id: batch.id,
      status: batch.status,
      totalUrls: batch.totalUrls,
      completedCount: batch.completedCount,
      failedCount: batch.failedCount,
      createdAt: batch.createdAt.toISOString(),
      updatedAt: batch.updatedAt.toISOString(),
    },
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
