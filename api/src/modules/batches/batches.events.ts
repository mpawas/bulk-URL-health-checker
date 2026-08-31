import type { FastifyInstance } from "fastify";
import { batchEventsChannel } from "@url-checker/shared";
import type { BatchesRepository } from "./batches.repository.js";
import { toBatchEvent } from "./batches.serialize.js";

export async function registerBatchEventRoutes(
  app: FastifyInstance,
  repository: BatchesRepository,
): Promise<void> {
  app.get<{ Params: { id: string } }>("/batches/:id", async (request, reply) => {
    const snapshot = await repository.findSnapshot(request.params.id);
    if (!snapshot) {
      return reply.code(404).send({ error: "not_found" });
    }
    return toBatchEvent("snapshot", snapshot, snapshot.urls);
  });

  app.get<{ Params: { id: string } }>(
    "/batches/:id/events",
    async (request, reply) => {
      const snapshot = await repository.findSnapshot(request.params.id);
      if (!snapshot) {
        return reply.code(404).send({ error: "not_found" });
      }

      reply.hijack();
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });

      const initial = toBatchEvent("snapshot", snapshot, snapshot.urls);
      reply.raw.write(`data: ${JSON.stringify(initial)}\n\n`);

      const subscriber = app.redis.duplicate();
      const channel = batchEventsChannel(request.params.id);
      await subscriber.subscribe(channel);

      const onMessage = (_ch: string, message: string) => {
        reply.raw.write(`data: ${message}\n\n`);
      };
      subscriber.on("message", onMessage);

      const heartbeat = setInterval(() => {
        reply.raw.write(": keepalive\n\n");
      }, 15_000);

      const cleanup = () => {
        clearInterval(heartbeat);
        subscriber.off("message", onMessage);
        void subscriber.unsubscribe(channel);
        void subscriber.quit();
      };

      request.raw.on("close", cleanup);
    },
  );
}
