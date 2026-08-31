import Fastify from "fastify";
import cors from "@fastify/cors";
import prismaPlugin from "./plugins/prisma.js";
import healthModule from "./modules/health/health.module.js";

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(prismaPlugin);
  await app.register(healthModule);

  // TODO(Module 2): batches module — POST /batches
  // TODO(Module 4): GET /batches/:id/events (SSE)
  // TODO(Module 5): POST /batches/:id/cancel, POST /batches/:id/retry-failed
  // TODO(Module 6): GET /batches (30s cached list)

  return app;
}
