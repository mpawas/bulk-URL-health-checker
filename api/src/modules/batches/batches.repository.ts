import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

export type PersistedBatchUrl = {
  id: string;
  url: string;
};

export type PersistedBatch = {
  batchId: string;
  totalUrls: number;
  urls: PersistedBatchUrl[];
};

export class BatchesRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Writes the batch and every URL row in one Prisma transaction, then returns.
   * Callers must not enqueue jobs until this resolves.
   */
  async createWithUrls(urls: string[]): Promise<PersistedBatch> {
    const batchId = randomUUID();
    const rows: PersistedBatchUrl[] = urls.map((url) => ({
      id: randomUUID(),
      url,
    }));

    await this.prisma.$transaction(async (tx) => {
      await tx.batch.create({
        data: {
          id: batchId,
          status: "pending",
          totalUrls: rows.length,
          urls: {
            create: rows.map((row) => ({
              id: row.id,
              url: row.url,
              status: "queued",
            })),
          },
        },
      });
    });

    return { batchId, totalUrls: rows.length, urls: rows };
  }

  async findSnapshot(batchId: string) {
    return this.prisma.batch.findUnique({
      where: { id: batchId },
      include: { urls: { orderBy: { updatedAt: "asc" } } },
    });
  }

  /**
   * Marks the batch cancelled and flips queued/checking rows. Completed and
   * failed rows are left alone. Returns job ids that must be dropped from BullMQ.
   */
  async cancel(batchId: string): Promise<
    | { status: "not_found" }
    | { status: "completed" }
    | { status: "cancelled"; removedJobIds: string[] }
  > {
    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({
        where: { id: batchId },
        include: { urls: true },
      });
      if (!batch) {
        return { status: "not_found" };
      }
      if (batch.status === "completed") {
        return { status: "completed" };
      }

      const removedJobIds = batch.urls
        .filter(
          (row) => row.status === "queued" || row.status === "checking",
        )
        .map((row) => row.id);

      await tx.batch.update({
        where: { id: batchId },
        data: { status: "cancelled" },
      });
      await tx.batchUrl.updateMany({
        where: {
          batchId,
          status: { in: ["queued", "checking"] },
        },
        data: { status: "cancelled" },
      });

      return { status: "cancelled", removedJobIds };
    });
  }

  /**
   * Re-queues only failed rows. Completed/cancelled URLs are never updated.
   */
  async retryFailed(batchId: string): Promise<
    | { status: "not_found" }
    | { status: "cancelled" }
    | { status: "none" }
    | { status: "queued"; batch: PersistedBatch }
  > {
    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({
        where: { id: batchId },
      });
      if (!batch) {
        return { status: "not_found" };
      }
      if (batch.status === "cancelled") {
        return { status: "cancelled" };
      }

      const failed = await tx.batchUrl.findMany({
        where: { batchId, status: "failed" },
        select: { id: true, url: true },
      });
      if (failed.length === 0) {
        return { status: "none" };
      }

      const ids = failed.map((row) => row.id);
      await tx.batchUrl.updateMany({
        where: { id: { in: ids }, status: "failed" },
        data: {
          status: "queued",
          statusCode: null,
          responseTimeMs: null,
          pageTitle: null,
        },
      });
      await tx.batch.update({
        where: { id: batchId },
        data: {
          status: "running",
          failedCount: 0,
        },
      });

      return {
        status: "queued",
        batch: {
          batchId,
          totalUrls: failed.length,
          urls: failed,
        },
      };
    });
  }
}
