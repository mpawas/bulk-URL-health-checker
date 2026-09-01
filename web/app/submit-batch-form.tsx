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
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Paste URLs (one per line)
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={6}
          className="rounded border border-zinc-300 bg-white px-3 py-2 font-mono text-sm"
          placeholder="https://example.com"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Or upload CSV
        <input
          type="file"
          accept=".csv,text/csv,text/plain"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="text-sm"
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Submit batch"}
      </button>
    </form>
  );
}
