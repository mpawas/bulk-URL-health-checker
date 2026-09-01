import { BatchEventSchema, type BatchEvent } from "@url-checker/shared";
import { publicApiUrl } from "./api";

export async function postBatchControl(
  batchId: string,
  action: "cancel" | "retry-failed",
): Promise<BatchEvent> {
  const response = await fetch(
    `${publicApiUrl()}/batches/${batchId}/${action}`,
    { method: "POST" },
  );
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? `request failed (${response.status})`);
  }
  return BatchEventSchema.parse(await response.json());
}
