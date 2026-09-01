import Link from "next/link";
import { fetchBatchList } from "@/lib/batches";

export default async function HomePage() {
  const { batches } = await fetchBatchList();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold">Batches</h1>
      {batches.length === 0 ? (
        <p className="text-sm text-zinc-500">No batches yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {batches.map((batch) => (
            <li key={batch.id}>
              <Link
                href={`/batches/${batch.id}`}
                className="flex flex-col gap-0.5 rounded border border-zinc-200 bg-white px-3 py-2 text-sm hover:border-zinc-400"
              >
                <span className="font-mono text-xs text-zinc-500">{batch.id}</span>
                <span>
                  {batch.status} · {batch.completedCount + batch.failedCount}/
                  {batch.totalUrls} settled
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
