import { Worker } from "bullmq";
import type { Job } from "bullmq";
import IORedis from "ioredis";
import { UrlCheckJobDataSchema } from "@url-checker/shared";
import { URL_CHECK_QUEUE, URL_CHECK_RATE_LIMIT } from "./url-check.config.js";

const connection = new IORedis(
  process.env.REDIS_URL ?? "redis://localhost:6379",
  { maxRetriesPerRequest: null },
);

async function processUrlCheck(job: Job): Promise<void> {
  const data = UrlCheckJobDataSchema.parse(job.data);
  console.log("url-check job received", {
    jobId: job.id,
    batchUrlId: data.batchUrlId,
    batchId: data.batchId,
    url: data.url,
  });
  throw new Error("not implemented — fetch and persist land in later Module 3 commits");
}

export function startUrlCheckWorker(): Worker {
  const worker = new Worker(URL_CHECK_QUEUE, processUrlCheck, {
    connection,
    limiter: {
      max: URL_CHECK_RATE_LIMIT.max,
      duration: URL_CHECK_RATE_LIMIT.duration,
    },
  });

  worker.on("ready", () => console.log("worker ready, waiting for jobs"));
  worker.on("failed", (job, err) =>
    console.error(`job ${job?.id} failed:`, err),
  );

  return worker;
}
