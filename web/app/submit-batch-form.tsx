"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  CreateBatchRequestSchema,
  CreateBatchResponseSchema,
} from "@url-checker/shared";
import { publicApiUrl } from "@/lib/api";

export function SubmitBatchForm() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      let response: Response;
      if (file) {
        const body = new FormData();
        body.append("file", file);
        response = await fetch(`${publicApiUrl()}/batches`, {
          method: "POST",
          body,
        });
      } else {
        const urls = text
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0);
        const parsed = CreateBatchRequestSchema.safeParse({ urls });
        if (!parsed.success) {
          setError("Paste at least one valid http(s) URL, one per line.");
          return;
        }
        response = await fetch(`${publicApiUrl()}/batches`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });
      }

      if (!response.ok) {
        setError(`Submit failed (${response.status})`);
        return;
      }

      const created = CreateBatchResponseSchema.parse(await response.json());
      router.push(`/batches/${created.batchId}`);
      router.refresh();
    } catch (err) {
      console.error("failed to submit batch", err);
      setError("Submit failed. Check the API is reachable.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800">
        Paste URLs (one per line)
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={6}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm font-normal text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none"
          placeholder="https://example.com"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800">
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          Or upload CSV
          <a
            href="/sample-urls.csv"
            download="sample-urls.csv"
            className="font-normal text-zinc-600 underline hover:text-zinc-900"
          >
            Download sample CSV
          </a>
        </span>
        <input
          type="file"
          accept=".csv,text/csv,text/plain"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="text-sm font-normal text-zinc-700 file:mr-3 file:rounded-md file:border file:border-zinc-300 file:bg-zinc-50 file:px-3 file:py-1.5 file:text-sm file:text-zinc-800"
        />
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md border border-zinc-900 bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        style={{ backgroundColor: "#18181b", color: "#ffffff" }}
      >
        {pending ? "Submitting…" : "Submit batch"}
      </button>
    </form>
  );
}
