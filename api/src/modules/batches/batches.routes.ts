import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { CreateBatchRequestSchema } from "@url-checker/shared";
import type { BatchesService } from "./batches.service.js";
import { parseCsvUrls } from "./parse-csv.js";

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
    return reply.code(201).send({
      batchId: batch.batchId,
      totalUrls: batch.totalUrls,
    });
  });
}
