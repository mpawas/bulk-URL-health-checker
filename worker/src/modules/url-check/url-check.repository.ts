import type { PrismaClient } from "@prisma/client";
import {
  BatchUrlStatus,
  UrlCheckResultWriteSchema,
  type UrlCheckResultWrite,
} from "@url-checker/shared";

const CLAIMABLE_STATUSES: BatchUrlStatus[] = ["queued", "checking", "failed"];

export class UrlCheckRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Claims the row for this attempt. Queued, in-flight, and failed rows can be
   * claimed so retry-failed reuses this processor. Completed and cancelled
   * results are never overwritten.
   */
  async tryMarkChecking(id: string, attemptCount: number): Promise<boolean> {
    const result = await this.prisma.batchUrl.updateMany({
      where: {
        id,
        status: { in: CLAIMABLE_STATUSES },
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
    const parsed = UrlCheckResultWriteSchema.parse(input);
    const result = await this.prisma.batchUrl.updateMany({
      where: {
        id: parsed.id,
        status: "checking",
      },
      data: {
        status: parsed.status,
        statusCode: parsed.statusCode,
        responseTimeMs: parsed.responseTimeMs,
        pageTitle: parsed.pageTitle,
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
