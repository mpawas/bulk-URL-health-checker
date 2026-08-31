import IORedis from "ioredis";
import { batchEventsChannel } from "@url-checker/shared";
import type { UrlCheckRepository } from "./url-check.repository.js";
import { toBatchEvent } from "./url-check.serialize.js";

const publisher = new IORedis(
  process.env.REDIS_URL ?? "redis://localhost:6379",
  { maxRetriesPerRequest: null },
);

export async function publishBatchUpdate(
  repository: UrlCheckRepository,
  batchId: string,
): Promise<void> {
  const snapshot = await repository.findSnapshot(batchId);
  if (!snapshot) {
    return;
  }
  const event = toBatchEvent("url_update", snapshot, snapshot.urls);
  await publisher.publish(batchEventsChannel(batchId), JSON.stringify(event));
}
