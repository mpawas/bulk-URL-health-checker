import {
  BatchEventSchema,
  BatchListResponseSchema,
  type BatchEvent,
  type BatchListResponse,
} from "@url-checker/shared";
import { serverApiUrl } from "./api";

export async function fetchBatchList(): Promise<BatchListResponse> {
  const response = await fetch(`${serverApiUrl()}/batches`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`failed to load batches: ${response.status}`);
  }
  return BatchListResponseSchema.parse(await response.json());
}

export async function fetchBatchEvent(
  id: string,
): Promise<BatchEvent | null> {
  const response = await fetch(`${serverApiUrl()}/batches/${id}`, {
    cache: "no-store",
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`failed to load batch ${id}: ${response.status}`);
  }
  return BatchEventSchema.parse(await response.json());
}
