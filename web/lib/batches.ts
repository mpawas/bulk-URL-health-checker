import { BatchListResponseSchema, type BatchListResponse } from "@url-checker/shared";
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
