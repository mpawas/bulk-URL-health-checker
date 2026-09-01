"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BatchStatus,
  BatchUrlStatus,
  type BatchEvent,
  type BatchUrl,
} from "@url-checker/shared";
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
  const settled = urls.filter((row: BatchUrl) =>
    row.status === BatchUrlStatus.enum.completed ||
    row.status === BatchUrlStatus.enum.failed ||
    row.status === BatchUrlStatus.enum.cancelled,
  ).length;
  const percent =
    batch.totalUrls === 0
      ? 0
      : Math.round((settled / batch.totalUrls) * 100);
  const [busy, setBusy] = useState<"cancel" | "retry" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canCancel =
    batch.status === BatchStatus.enum.pending ||
    batch.status === BatchStatus.enum.running;
  const canRetry =
    batch.status !== BatchStatus.enum.cancelled &&
    urls.some((row) => row.status === BatchUrlStatus.enum.failed);

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
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10 text-zinc-900">
      <p className="text-sm">
        <Link href="/" className="text-zinc-600 hover:text-zinc-900">
          ← Batches
        </Link>
      </p>
      <header className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h1 className="break-all font-mono text-base text-zinc-900">{batch.id}</h1>
        <p className="mt-1 text-sm text-zinc-600">
          {batch.status} · {settled}/{batch.totalUrls} settled
        </p>
        <div
          className="mt-4 h-2 w-full overflow-hidden rounded bg-zinc-200"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label="Batch progress"
        >
          <div
            className="h-full bg-zinc-900 transition-[width]"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-zinc-500">{percent}%</p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={!canCancel || busy !== null}
            onClick={() => void run("cancel", "cancel")}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 hover:bg-zinc-50 disabled:opacity-40"
          >
            {busy === "cancel" ? "Cancelling…" : "Cancel"}
          </button>
          <button
            type="button"
            disabled={!canRetry || busy !== null}
            onClick={() => void run("retry", "retry-failed")}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 hover:bg-zinc-50 disabled:opacity-40"
          >
            {busy === "retry" ? "Retrying…" : "Retry failed"}
          </button>
        </div>
        {actionError ? (
          <p className="mt-2 text-sm text-red-700">{actionError}</p>
        ) : null}
      </header>
      <ul className="flex flex-col gap-2">
        {urls.map((row) => (
          <li
            key={row.id}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm"
          >
            <p className="break-all font-mono text-zinc-900">{row.url}</p>
            <p className="mt-1 text-zinc-600">
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
