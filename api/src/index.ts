import Fastify from "fastify";
import cors from "@fastify/cors";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

// TODO(Module 2): POST /batches
// TODO(Module 4): GET /batches/:id/events (SSE)
// TODO(Module 5): POST /batches/:id/cancel, POST /batches/:id/retry-failed
// TODO(Module 6): GET /batches (30s cached list)

app.get("/health", async () => ({ status: "ok" }));

const port = Number(process.env.PORT ?? 4000);
app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
