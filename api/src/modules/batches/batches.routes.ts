import type { FastifyInstance } from "fastify";
import { CreateBatchRequestSchema } from "@url-checker/shared";
import type { BatchesService } from "./batches.service.js";

export async function registerBatchesRoutes(
  app: FastifyInstance,
  service: BatchesService,
): Promise<void> {
  app.post("/batches", async (request, reply) => {
    const parsed = CreateBatchRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "invalid_request",
        details: parsed.error.flatten(),
      });
    }

    const batch = await service.createFromUrlList(parsed.data.urls);
    return reply.code(201).send({
      batchId: batch.batchId,
      totalUrls: batch.totalUrls,
    });
  });
}
