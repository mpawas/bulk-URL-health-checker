# Bulk URL Health Checker

Dashboard for submitting a batch of URLs. Workers check each URL in the background;
Postgres is the source of truth. Redis holds only ephemeral queue, cache, and pub/sub
state — every view can be reconstructed from Postgres alone.

## Run the whole system

`docker compose up` is the one command that starts every service (Postgres, Redis, API,
worker, and web). Copy the env file first so Compose can load it:

```bash
cp .env.example .env
docker compose up --build
```

| Service  | URL / port |
|----------|------------|
| Web dashboard | http://localhost:3000 |
| Batch page | http://localhost:3000/batches/{id} |
| Sample CSV | http://localhost:3000/sample-urls.csv |
| API | http://localhost:4000 (`GET /health`) |
| API (2nd instance) | http://localhost:4001 when scaled to 2 |
| Postgres | localhost:5432 |
| Redis | localhost:6379 |

Stop with `Ctrl+C`, or `docker compose down` in another terminal.

## Environment

Compose loads the root `.env` (`cp .env.example .env`) and then sets service
URLs in `docker-compose.yml`. For running a package on the host, copy the
matching template:

| Package | Template | Variables in use today |
|---------|----------|------------------------|
| API | `api/.env.example` | `DATABASE_URL`, `REDIS_URL`, `PORT` |
| Worker | `worker/.env.example` | `DATABASE_URL`, `REDIS_URL` |
| Web | `web/.env.example` | `NEXT_PUBLIC_API_URL` (browser), `API_URL_INTERNAL` (server fetch) |

Worker rate limit, concurrency, attempts, and backoff are **constants** in
`worker/src/modules/url-check/url-check.config.ts` (`10` req/s global, `5`
in-flight per process, `3` attempts, `1000ms` exponential base). They are
listed as commented placeholders in `worker/.env.example` so they can be moved
to env later without hunting through source.

Prisma migrations apply automatically when the API starts (`prisma migrate deploy`).
To apply them without starting the server: `pnpm migrate`.

The API is Fastify plugins (domain modules). Postgres access goes through Prisma.

### API surface

| Method | Path | Role |
|--------|------|------|
| GET | `/health` | Liveness |
| GET | `/batches` | List (Redis cache, 30s TTL, invalidated on write) |
| POST | `/batches` | Create from JSON `{ "urls": [...] }` or CSV upload |
| GET | `/batches/:id` | Full snapshot from Postgres |
| GET | `/batches/:id/events` | SSE: snapshot on connect, then Redis relay |
| POST | `/batches/:id/cancel` | Cancel queued/checking rows, drop waiting jobs |
| POST | `/batches/:id/retry-failed` | Re-enqueue only `failed` rows |

## Architecture

```
Browser ──► Next.js web ──HTTP──► Fastify API (stateless, N instances)
                 ▲                    │
                 │ SSE                ▼
           Redis pub/sub ◄──────── PostgreSQL (source of truth)
                 ▲                    ▲
                 │ publish            │ writes
           BullMQ (Redis) ◄──── Worker(s) (separate process, N instances)
```

- **API** — Fastify, no in-process job state. Horizontal scale is safe because live
  updates fan out through Redis pub/sub, not a single Node process. `GET /batches`
  is cached in Redis for 30 seconds and deleted on create, cancel, retry, and
  every worker status write so the list never lags a user-visible write.
- **Worker** — separate image/process from the API. BullMQ global rate limit is
  10 req/s across all workers; concurrency is 5 in-flight checks per worker;
  exponential backoff, max 3 attempts. Result writes are idempotent (`UPDATE`
  guarded so completed/cancelled rows are never overwritten).
- **Web** — Next.js App Router. The home page is a Server Component over the
  cached list; a batch URL is a Server Component snapshot plus a Client
  Component EventSource that merges snapshots on reconnect.

## Horizontal scaling

API and worker are designed to run as multiple containers against the same Postgres
and Redis:

```bash
docker compose up --scale worker=2 --scale api=2
```

The rate limiter is global (Redis-backed), so extra workers must not exceed 10 HTTP
checks per second combined. After submitting a batch with 2+ workers running:

```bash
pnpm test:rate-limit
```

Multiple API instances share one Redis pub/sub channel per batch (`batch:{id}`) so
every SSE client sees the same events. With two API containers (host ports 4000
and 4001):

```bash
pnpm test:sse-ha
```

## Trade-offs

- Postgres over Redis for durable batch/URL state: a Redis flush or worker crash
  cannot lose results; list and detail views always rebuild from SQL.
- SSE + Redis pub/sub instead of WebSockets: reconnect is a first-class EventSource
  behavior, and any API instance can relay because it subscribes to Redis rather
  than holding exclusive client state.
- Shared Zod package (`@url-checker/shared`) instead of duplicated TypeScript
  interfaces: api, worker, and web import the same schemas.
- Prisma instead of raw `pg` queries: migrations and typed access live in one
  schema; the worker generates a client from `api/prisma/schema.prisma`.
- 30s list cache with explicit invalidation instead of always hitting Postgres:
  the TTL is only a ceiling; writes delete `batches:list` so a refresh cannot
  show a pre-write list.

## Assumptions

These are the calls made where the spec was silent or listed an explicit assumption
to record (requirements §5).

- **CSV format:** one URL per line. Optional header row — if the first cell is not
  an `http(s)` URL, that line is skipped. A sample file is served at
  `/sample-urls.csv` on the web app. Quoted cells are unquoted; only the first
  column is read.
- **Transient failure:** network error, abort after a 10s fetch timeout, or HTTP
  5xx. Those retry with exponential backoff, max 3 attempts. HTTP 4xx is not
  retried (`UnrecoverableError`); the row is stored as `failed`.
- **Page title:** best-effort parse of the first HTML `<title>` tag. The worker
  only reads a body when `Content-Type` includes `text/html`, and only the first
  100 KB. Non-HTML responses skip title extraction.
- **Stale `checking` rows:** the spec assumed a timeout sweep to `failed` so
  retry-failed could pick them up. This build does **not** run that sweeper. A
  worker that dies after claiming a row leaves it `checking`. Cancel will mark
  queued/checking rows `cancelled`. `POST /batches/:id/retry-failed` re-enqueues
  **only** `status=failed` — never completed, cancelled, or checking.
- **Cancel vs in-flight HTTP:** waiting BullMQ jobs are removed immediately.
  A job that has already started `fetch()` is not aborted mid-request; the
  worker skips the write if the row is no longer `checking`. The cancel check
  runs after claim and before fetch so in-flight work that has not opened a
  socket yet does not hit the URL.
- **List cache:** `GET /batches` may be served from Redis for up to 30s, but
  create / cancel / retry-failed / worker progress all `DEL batches:list`, so a
  user-visible write is never hidden behind the TTL.
- **Worker knobs:** queue name, global 10 req/s limiter, per-process concurrency
  5, max 3 attempts, and 1000ms exponential backoff are constants in
  `url-check.config.ts`. They can be lifted into `worker/.env` later (see
  `worker/.env.example`) if operators need to change them without a code change.
- **Dashboard theme:** the UI forces `color-scheme: light` so macOS dark mode
  cannot invert text onto white cards.

## Out of scope

Auth, notifications, charts, and a separately recorded Loom walkthrough.
Polished visual design was out of spec; the dashboard is a functional light
theme so status and IDs stay readable.
