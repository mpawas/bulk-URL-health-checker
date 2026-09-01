"use client";

import type { BatchEvent } from "@url-checker/shared";
import { useBatchEvents } from "@/lib/use-batch-events";

export function BatchLive({
  batchId,
  initial,
}: {
  batchId: string;
  initial: BatchEvent;
}) {
  const { event, applyEvent } = useBatchEvents(batchId, initial);
  const { batch, urls } = event;
  const done = batch.completedCount + batch.failedCount;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-zinc-500">Batch</p>
        <h1 className="font-mono text-lg">{batch.id}</h1>
        <p className="text-sm text-zinc-600">
          {batch.status} · {done}/{batch.totalUrls} settled
        </p>
      </header>
      <ul className="flex flex-col gap-2">
        {urls.map((row) => (
          <li
            key={row.id}
            className="rounded border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
          >
            <p className="break-all font-mono">{row.url}</p>
            <p className="text-zinc-500">
              {row.status}
              {row.statusCode !== null ? ` · HTTP ${row.statusCode}` : ""}
              {row.responseTimeMs !== null ? ` · ${row.responseTimeMs}ms` : ""}
              {row.pageTitle ? ` · ${row.pageTitle}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
