import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { BatchesRepository } from "./batches.repository.js";
import { registerBatchesRoutes } from "./batches.routes.js";
import { BatchesService } from "./batches.service.js";

async function batchesModule(app: FastifyInstance): Promise<void> {
  const repository = new BatchesRepository(app.prisma);
  const service = new BatchesService(repository);
  await registerBatchesRoutes(app, service);
}

export default fp(batchesModule, {
  name: "batches-module",
  dependencies: ["prisma-module"],
});
