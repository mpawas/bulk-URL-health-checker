/** Queue name shared with the API producer. */
export const URL_CHECK_QUEUE = "url-check";

/**
 * BullMQ group limiter is Redis-backed, so this cap is global across every
 * worker process that consumes `url-check` — not 10 req/s per container.
 */
export const URL_CHECK_RATE_LIMIT = {
  max: 10,
  duration: 1000,
} as const;
