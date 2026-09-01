import type IORedis from "ioredis";
import { batchEventsChannel } from "@url-checker/shared";
import type { BatchesRepository } from "./batches.repository.js";
import { toBatchEvent } from "./batches.serialize.js";
import type { BatchEvent } from "@url-checker/shared";

export async function publishBatchUpdate(
  redis: IORedis,
  repository: BatchesRepository,
  batchId: string,
): Promise<BatchEvent | null> {
  const snapshot = await repository.findSnapshot(batchId);
  if (!snapshot) {
    return null;
  }
  const event = toBatchEvent("url_update", snapshot, snapshot.urls);
  await redis.publish(batchEventsChannel(batchId), JSON.stringify(event));
  return event;
}
