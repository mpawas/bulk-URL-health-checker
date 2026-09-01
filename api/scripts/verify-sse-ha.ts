import { lookup } from "node:dns/promises";
import {
  BatchEventSchema,
  CreateBatchResponseSchema,
  type BatchEvent,
} from "@url-checker/shared";

const WAIT_MS = 20_000;

async function apiBases(): Promise<string[]> {
  const fromEnv = process.env.API_URLS;
  if (fromEnv) {
    const listed = fromEnv
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    return listed;
  }

  const host = process.env.API_HOST ?? "api";
  const records = await lookup(host, { all: true, family: 4 });
  const unique = [...new Set(records.map((record) => record.address))];
  return unique.map((ip) => `http://${ip}:4000`);
}

async function waitForHealth(base: string): Promise<void> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${base}/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // instance still starting
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`API at ${base} did not become healthy`);
}

async function collectSse(
  base: string,
  batchId: string,
  timeoutMs: number,
): Promise<BatchEvent[]> {
  const events: BatchEvent[] = [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${base}/batches/${batchId}/events`, {
      headers: { Accept: "text/event-stream" },
      signal: controller.signal,
    });
    if (!response.ok || response.body === null) {
      throw new Error(`${base} SSE HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      let separator = buffer.indexOf("\n\n");
      while (separator !== -1) {
        const raw = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);
        const dataLine = raw
          .split("\n")
          .find((line) => line.startsWith("data: "));
        if (dataLine) {
          const parsed = BatchEventSchema.safeParse(
            JSON.parse(dataLine.slice("data: ".length)),
          );
          if (parsed.success) {
            events.push(parsed.data);
            if (
              parsed.data.batch.status === "completed" ||
              parsed.data.batch.status === "cancelled"
            ) {
              controller.abort();
            }
          }
        }
        separator = buffer.indexOf("\n\n");
      }
    }
  } catch (err) {
    if (!controller.signal.aborted) {
      throw err;
    }
  } finally {
    clearTimeout(timer);
  }

  return events;
}

function fingerprint(event: BatchEvent): string {
  const urls = [...event.urls]
    .map(
      (row) =>
        `${row.id}:${row.status}:${row.statusCode ?? ""}:${row.pageTitle ?? ""}`,
    )
    .sort()
    .join("|");
  return `${event.batch.status}:${event.batch.completedCount}:${event.batch.failedCount}:${urls}`;
}

const bases = await apiBases();
if (bases.length < 2) {
  console.error(
    `need 2+ API instances, resolved ${bases.length}: ${bases.join(", ") || "(none)"}`,
  );
  console.error(
    "run: docker compose up --scale api=2  (or set API_URLS=http://host:4000,http://host:4001)",
  );
  process.exit(1);
}

console.log(`API instances: ${bases.join(", ")}`);
await Promise.all(bases.map((base) => waitForHealth(base)));

const createResponse = await fetch(`${bases[0]}/batches`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    urls: [
      "https://example.com/?ha=1",
      "https://example.com/?ha=2",
      "https://example.com/?ha=3",
      "https://www.iana.org/",
    ],
  }),
});
if (!createResponse.ok) {
  console.error(`POST /batches failed: ${createResponse.status}`);
  process.exit(1);
}
const created = CreateBatchResponseSchema.parse(await createResponse.json());
console.log(`batch ${created.batchId}`);

const streams = await Promise.all(
  bases.map((base) => collectSse(base, created.batchId, WAIT_MS)),
);

for (let i = 0; i < bases.length; i += 1) {
  const events = streams[i] ?? [];
  const snapshots = events.filter((event) => event.type === "snapshot");
  console.log(
    `${bases[i]} events=${events.length} snapshots=${snapshots.length} last=${events.at(-1)?.batch.status ?? "none"}`,
  );
  if (snapshots.length === 0) {
    console.error(`FAIL: ${bases[i]} never pushed a snapshot on connect`);
    process.exit(1);
  }
}

const snapshots = await Promise.all(
  bases.map(async (base) => {
    const response = await fetch(`${base}/batches/${created.batchId}`);
    if (!response.ok) {
      throw new Error(`GET ${base}/batches/${created.batchId} HTTP ${response.status}`);
    }
    return BatchEventSchema.parse(await response.json());
  }),
);

const prints = snapshots.map((event) => fingerprint(event));
if (prints.some((value) => value !== prints[0])) {
  console.error("FAIL: API instances served different snapshots");
  snapshots.forEach((event, i) => {
    console.error(`  ${bases[i]} ${fingerprint(event)}`);
  });
  process.exit(1);
}

const liveRelay = streams.every((events) =>
  events.some((event) => event.type === "url_update"),
);
if (!liveRelay) {
  console.log(
    "note: one or more SSE streams missed live url_update (batch may have finished before subscribe); snapshots still match",
  );
}

console.log(`PASS: ${bases.length} API instances agree on batch ${created.batchId} (${prints[0]})`);
