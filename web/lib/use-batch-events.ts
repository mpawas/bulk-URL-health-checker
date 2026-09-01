"use client";

import { useEffect, useState } from "react";
import {
  BatchEventSchema,
  BatchStatus,
  type BatchEvent,
} from "@url-checker/shared";
import { publicApiUrl } from "./api";
import { mergeBatchEvent } from "./merge-batch-event";

const INITIAL_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 8_000;

function needsLiveStream(status: BatchStatus): boolean {
  return (
    status === BatchStatus.enum.pending || status === BatchStatus.enum.running
  );
}

/**
 * Subscribes to `/batches/:id/events` while the batch is still in progress.
 * Closes the EventSource once status is completed/cancelled so DevTools does
 * not show a forever-pending request. Reopens after retry-failed if the batch
 * becomes running again.
 */
export function useBatchEvents(
  batchId: string,
  initial: BatchEvent,
): {
  event: BatchEvent;
  applyEvent: (incoming: BatchEvent) => void;
} {
  const [event, setEvent] = useState(initial);
  const live = needsLiveStream(event.batch.status);

  useEffect(() => {
    if (!live) {
      return;
    }

    let closed = false;
    let source: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let backoffMs = INITIAL_BACKOFF_MS;

    const disconnect = () => {
      if (retryTimer !== undefined) {
        clearTimeout(retryTimer);
        retryTimer = undefined;
      }
      source?.close();
      source = null;
    };

    const connect = () => {
      if (closed) {
        return;
      }

      source = new EventSource(
        `${publicApiUrl()}/batches/${batchId}/events`,
      );

      source.onmessage = (message) => {
        backoffMs = INITIAL_BACKOFF_MS;
        let payload: unknown;
        try {
          payload = JSON.parse(message.data) as unknown;
        } catch (err) {
          console.error("sse payload is not json", err);
          return;
        }

        const parsed = BatchEventSchema.safeParse(payload);
        if (!parsed.success) {
          console.error(
            "sse payload failed schema check",
            parsed.error.flatten(),
          );
          return;
        }

        setEvent((current) => mergeBatchEvent(current, parsed.data));

        if (!needsLiveStream(parsed.data.batch.status)) {
          closed = true;
          disconnect();
        }
      };

      source.onerror = () => {
        source?.close();
        source = null;
        if (closed) {
          return;
        }
        retryTimer = setTimeout(() => {
          backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
          connect();
        }, backoffMs);
      };
    };

    connect();

    return () => {
      closed = true;
      disconnect();
    };
  }, [batchId, live]);

  return {
    event,
    applyEvent: (incoming: BatchEvent) => {
      setEvent((current) => mergeBatchEvent(current, incoming));
    },
  };
}
