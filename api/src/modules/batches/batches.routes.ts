import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { CreateBatchRequestSchema, CreateBatchResponseSchema } from "@url-checker/shared";
import type { BatchesService } from "./batches.service.js";
import { parseCsvUrls } from "./parse-csv.js";

const BatchIdParams = z.object({ id: z.string().uuid() });

async function readUrls(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<string[] | null> {
  if (request.isMultipart()) {
    const file = await request.file();
    if (!file) {
      await reply.code(400).send({
        error: "invalid_request",
        details: { formErrors: ["CSV file is required"], fieldErrors: {} },
      });
      return null;
    }
    const text = (await file.toBuffer()).toString("utf8");
    const parsed = CreateBatchRequestSchema.safeParse({
      urls: parseCsvUrls(text),
    });
    if (!parsed.success) {
      await reply.code(400).send({
        error: "invalid_request",
        details: parsed.error.flatten(),
      });
      return null;
    }
    return parsed.data.urls;
  }

  const parsed = CreateBatchRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    await reply.code(400).send({
      error: "invalid_request",
      details: parsed.error.flatten(),
    });
    return null;
  }
  return parsed.data.urls;
}

export async function registerBatchesRoutes(
  app: FastifyInstance,
  service: BatchesService,
): Promise<void> {
  app.post("/batches", async (request, reply) => {
    const urls = await readUrls(request, reply);
    if (!urls) {
      return;
    }

    const batch = await service.createFromUrlList(urls);
    return reply.code(201).send(
      CreateBatchResponseSchema.parse({
        batchId: batch.batchId,
        totalUrls: batch.totalUrls,
        status: "pending",
        trackingUrl: `/batches/${batch.batchId}`,
        enqueueFailures: batch.enqueueFailures,
      }),
    );
  });

  app.post<{ Params: { id: string } }>(
    "/batches/:id/cancel",
    async (request, reply) => {
      const params = BatchIdParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: "invalid_id" });
      }

      const result = await service.cancel(params.data.id);
      if (result.status === "not_found") {
        return reply.code(404).send({ error: "not_found" });
      }
      if (result.status === "completed") {
        return reply.code(409).send({ error: "already_completed" });
      }
      return result.event;
    },
  );

  app.post<{ Params: { id: string } }>(
    "/batches/:id/retry-failed",
    async (request, reply) => {
      const params = BatchIdParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: "invalid_id" });
      }

      const result = await service.retryFailed(params.data.id);
      if (result.status === "not_found") {
        return reply.code(404).send({ error: "not_found" });
      }
      if (result.status === "cancelled") {
        return reply.code(409).send({ error: "batch_cancelled" });
      }
      return result.event;
    },
  );
}
