import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import IORedis from "ioredis";

declare module "fastify" {
  interface FastifyInstance {
    redis: IORedis;
  }
}

async function redisPlugin(app: FastifyInstance): Promise<void> {
  const redis = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });
  app.decorate("redis", redis);
  app.addHook("onClose", async (instance) => {
    await instance.redis.quit();
  });
}

export default fp(redisPlugin, { name: "redis-module" });
