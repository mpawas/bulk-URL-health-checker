import type { PrismaClient } from "@prisma/client";

export type UrlCheckResultWrite = {
  id: string;
  status: "completed" | "failed";
  statusCode: number | null;
  responseTimeMs: number | null;
  pageTitle: string | null;
};

export class UrlCheckRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Claims the row for this attempt. Returns false when a completed/cancelled
   * result already exists so a restart cannot overwrite it.
   */
  async tryMarkChecking(id: string, attemptCount: number): Promise<boolean> {
    const result = await this.prisma.batchUrl.updateMany({
      where: {
        id,
        status: { notIn: ["completed", "cancelled"] },
      },
      data: {
        status: "checking",
        attemptCount,
      },
    });
    return result.count === 1;
  }

  async isBatchCancelled(batchId: string): Promise<boolean> {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      select: { status: true },
    });
    return batch?.status === "cancelled";
  }

  /**
   * Used when a job is already active but the batch was cancelled. Never
   * overwrites a completed result.
   */
  async markUrlCancelled(id: string): Promise<void> {
    await this.prisma.batchUrl.updateMany({
      where: {
        id,
        status: { notIn: ["completed"] },
      },
      data: { status: "cancelled" },
    });
  }

  async writeResult(input: UrlCheckResultWrite): Promise<boolean> {
    const result = await this.prisma.batchUrl.updateMany({
      where: {
        id: input.id,
        status: "checking",
      },
      data: {
        status: input.status,
        statusCode: input.statusCode,
        responseTimeMs: input.responseTimeMs,
        pageTitle: input.pageTitle,
      },
    });
    return result.count === 1;
  }

  async refreshBatch(batchId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const grouped = await tx.batchUrl.groupBy({
        by: ["status"],
        where: { batchId },
        _count: { _all: true },
      });

      const countOf = (status: string): number =>
        grouped.find((row) => row.status === status)?._count._all ?? 0;

      const completed = countOf("completed");
      const failed = countOf("failed");
      const cancelled = countOf("cancelled");
      const total = grouped.reduce((sum, row) => sum + row._count._all, 0);
      const inFlight = total - completed - failed - cancelled;

      const existing = await tx.batch.findUnique({
        where: { id: batchId },
        select: { status: true },
      });

      let status = "running";
      if (existing?.status === "cancelled") {
        status = "cancelled";
      } else if (inFlight === 0) {
        status = cancelled === total ? "cancelled" : "completed";
      }

      await tx.batch.update({
        where: { id: batchId },
        data: {
          completedCount: completed,
          failedCount: failed,
          status,
        },
      });
    });
  }

  async findSnapshot(batchId: string) {
    return this.prisma.batch.findUnique({
      where: { id: batchId },
      include: { urls: { orderBy: { updatedAt: "asc" } } },
    });
  }
}
