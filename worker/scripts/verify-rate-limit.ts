import IORedis from "ioredis";
import { URL_CHECK_QUEUE, URL_CHECK_RATE_LIMIT } from "../src/modules/url-check/url-check.config.js";

const redis = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const keys = await redis.keys(`${URL_CHECK_QUEUE}:starts:*`);
if (keys.length === 0) {
  console.error("no start counters found — submit a batch while 2+ workers are running first");
  await redis.quit();
  process.exit(1);
}

const counts = await redis.mget(keys);
let peak = 0;
for (let i = 0; i < keys.length; i += 1) {
  const value = Number(counts[i] ?? 0);
  console.log(`${keys[i]} = ${value}`);
  if (value > peak) {
    peak = value;
  }
}

await redis.quit();

if (peak > URL_CHECK_RATE_LIMIT.max) {
  console.error(
    `FAIL: peak ${peak} starts/s exceeds global cap ${URL_CHECK_RATE_LIMIT.max}`,
  );
  process.exit(1);
}

console.log(
  `PASS: peak ${peak} starts/s <= global cap ${URL_CHECK_RATE_LIMIT.max} (keys=${keys.length})`,
);
