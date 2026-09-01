"use client";

import Link from "next/link";
import { useState } from "react";
import type { BatchEvent } from "@url-checker/shared";
import { postBatchControl } from "@/lib/batch-actions";
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
  const [busy, setBusy] = useState<"cancel" | "retry" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canCancel =
    batch.status === "pending" || batch.status === "running";
  const canRetry =
    batch.status !== "cancelled" &&
    urls.some((row) => row.status === "failed");

  async function run(
    kind: "cancel" | "retry",
    action: "cancel" | "retry-failed",
  ): Promise<void> {
    setActionError(null);
    setBusy(kind);
    try {
      const next = await postBatchControl(batchId, action);
      applyEvent(next);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`failed to ${action}`, err);
      setActionError(message);
    } finally {
      setBusy(null);
    }
  }

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
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            disabled={!canCancel || busy !== null}
            onClick={() => void run("cancel", "cancel")}
            className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm disabled:opacity-40"
          >
            {busy === "cancel" ? "Cancelling…" : "Cancel"}
          </button>
          <button
            type="button"
            disabled={!canRetry || busy !== null}
            onClick={() => void run("retry", "retry-failed")}
            className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm disabled:opacity-40"
          >
            {busy === "retry" ? "Retrying…" : "Retry failed"}
          </button>
        </div>
        {actionError ? (
          <p className="text-sm text-red-600">{actionError}</p>
        ) : null}
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
