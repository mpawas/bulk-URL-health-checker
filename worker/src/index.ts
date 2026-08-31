import { Worker } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(
  process.env.REDIS_URL ?? "redis://localhost:6379",
  {
    maxRetriesPerRequest: null,
  },
);

async function processUrlCheck(_job: unknown) {
  throw new Error("not implemented — see Module 3 in REQUIREMENTS.md");
}

const worker = new Worker("url-check", processUrlCheck, {
  connection,
  concurrency: 5,
  limiter: {
    max: 10,
    duration: 1000,
  },
});

worker.on("ready", () => console.log("worker ready, waiting for jobs"));
worker.on("failed", (job, err) => console.error(`job ${job?.id} failed:`, err));

process.on("SIGTERM", async () => {
  await worker.close();
  process.exit(0);
});
