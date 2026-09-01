import type IORedis from "ioredis";
import {
  BATCH_LIST_CACHE_KEY,
  BATCH_LIST_CACHE_TTL_SECONDS,
  BatchListResponseSchema,
  type BatchListResponse,
} from "@url-checker/shared";

export async function readBatchListCache(
  redis: IORedis,
): Promise<BatchListResponse | null> {
  const raw = await redis.get(BATCH_LIST_CACHE_KEY);
  if (raw === null) {
    return null;
  }
  try {
    const parsed = BatchListResponseSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch (err) {
    console.error("invalid batches list cache payload", err);
    return null;
  }
}

export async function writeBatchListCache(
  redis: IORedis,
  payload: BatchListResponse,
): Promise<void> {
  await redis.set(
    BATCH_LIST_CACHE_KEY,
    JSON.stringify(payload),
    "EX",
    BATCH_LIST_CACHE_TTL_SECONDS,
  );
}
