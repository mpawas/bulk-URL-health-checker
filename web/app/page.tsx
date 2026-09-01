import Link from "next/link";
import type { Batch } from "@url-checker/shared";
import { fetchBatchList } from "@/lib/batches";
import { SubmitBatchForm } from "./submit-batch-form";

function statusLabel(status: Batch["status"]): string {
  return status.replaceAll("_", " ");
}

export default async function HomePage() {
  const { batches } = await fetchBatchList();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10">
      <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h1 className="text-lg font-semibold text-zinc-900">New batch</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Paste URLs or upload a CSV. Checks run in the background.
        </p>
        <div className="mt-4">
          <SubmitBatchForm />
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">Batches</h2>
        {batches.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-8 text-center text-sm text-zinc-600">
            No batches yet. Submit a list above to get started.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {batches.map((batch: Batch) => {
              const settled = batch.completedCount + batch.failedCount;
              return (
                <li key={batch.id}>
                  <Link
                    href={`/batches/${batch.id}`}
                    className="flex flex-col gap-1 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-zinc-900 shadow-sm hover:border-zinc-400"
                  >
                    <span className="font-mono text-xs text-zinc-500">
                      {batch.id}
                    </span>
                    <span className="text-sm font-medium text-zinc-900">
                      {statusLabel(batch.status)} · {settled}/{batch.totalUrls}{" "}
                      settled
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
