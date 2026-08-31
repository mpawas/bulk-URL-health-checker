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
}
