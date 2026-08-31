import Fastify from "fastify";
import cors from "@fastify/cors";
import prismaPlugin from "./plugins/prisma.js";
import healthModule from "./modules/health/health.module.js";
import batchesModule from "./modules/batches/batches.module.js";

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(prismaPlugin);
  await app.register(healthModule);
  await app.register(batchesModule);

  return app;
}
