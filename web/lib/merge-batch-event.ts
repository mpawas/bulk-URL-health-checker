import type { Batch, BatchEvent, BatchUrl } from "@url-checker/shared";

/**
 * Snapshot replaces local state (Postgres is source of truth on reconnect).
 * url_update merges per URL id, keeping the newer `updatedAt` so a delayed
 * event cannot clobber a fresher row after a dropped connection.
 */
export function mergeBatchEvent(
  current: BatchEvent | null,
  incoming: BatchEvent,
): BatchEvent {
  if (current === null || incoming.type === "snapshot") {
    return incoming;
  }

  const currentById = new Map<string, BatchUrl>(
    current.urls.map((row) => [row.id, row]),
  );
  const incomingById = new Map<string, BatchUrl>(
    incoming.urls.map((row) => [row.id, row]),
  );
  const ids = new Set([...currentById.keys(), ...incomingById.keys()]);

  const urls = [...ids].map((id) => {
    const existing = currentById.get(id);
    const next = incomingById.get(id);
    if (!existing) {
      return next!;
    }
    if (!next) {
      return existing;
    }
    return next.updatedAt >= existing.updatedAt ? next : existing;
  });

  const batch: Batch =
    incoming.batch.updatedAt >= current.batch.updatedAt
      ? incoming.batch
      : current.batch;

  return { type: incoming.type, batch, urls };
}
