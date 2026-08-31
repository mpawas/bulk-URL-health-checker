import type { FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import fp from "fastify-plugin";
import { BatchesQueue } from "./batches.queue.js";
import { BatchesRepository } from "./batches.repository.js";
import { registerBatchesRoutes } from "./batches.routes.js";
import { BatchesService } from "./batches.service.js";

async function batchesModule(app: FastifyInstance): Promise<void> {
  await app.register(multipart);
  const repository = new BatchesRepository(app.prisma);
  const queue = new BatchesQueue();
  const service = new BatchesService(repository, queue);
  await registerBatchesRoutes(app, service);
}

export default fp(batchesModule, {
  name: "batches-module",
  dependencies: ["prisma-module"],
});
