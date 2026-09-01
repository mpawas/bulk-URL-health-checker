/**
 * Queue / limiter / retry knobs. Hardcoded for now so `docker compose up` has
 * a known-good default. When you need to retune without a rebuild, read these
 * from the environment (see worker/.env.example) instead of this file.
 */
export const URL_CHECK_QUEUE = "url-check";

/**
 * BullMQ group limiter is Redis-backed, so this cap is global across every
 * worker process that consumes `url-check` — not 10 req/s per container.
 */
export const URL_CHECK_RATE_LIMIT = {
  max: 10,
  duration: 1000,
} as const;

/** In-flight HTTP checks per worker process. */
export const URL_CHECK_CONCURRENCY = 5;

export const URL_CHECK_MAX_ATTEMPTS = 3;

export const URL_CHECK_BACKOFF_DELAY_MS = 1000;
