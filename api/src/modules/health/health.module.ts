import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

async function healthModule(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => ({ status: "ok" }));
}

export default fp(healthModule, { name: "health-module" });
