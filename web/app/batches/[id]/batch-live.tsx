"use client";

import Link from "next/link";
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
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <p className="text-sm">
        <Link href="/" className="text-zinc-500 hover:text-zinc-800">
          ← Batches
        </Link>
      </p>
      <header className="flex flex-col gap-1">
        <h1 className="font-mono text-lg break-all">{batch.id}</h1>
        <p className="text-sm text-zinc-600">
          {batch.status} · {done}/{batch.totalUrls} settled
        </p>
      </header>
      <ul className="flex flex-col gap-2">
        {urls.map((row) => (
          <li
            key={row.id}
            className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm"
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
