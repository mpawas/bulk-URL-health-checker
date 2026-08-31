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

| Service  | URL / port        |
|----------|-------------------|
| Web      | http://localhost:3000 |
| API      | http://localhost:4000 (`GET /health`) |
| Postgres | localhost:5432    |
| Redis    | localhost:6379    |

Stop with `Ctrl+C`, or `docker compose down` in another terminal.

Prisma migrations apply automatically when the API starts (`prisma migrate deploy`).
To apply them without starting the server: `pnpm migrate`.

The API is organized as Fastify plugins (domain modules). Postgres access goes
through Prisma — not raw `pg` queries.

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
  updates fan out through Redis pub/sub, not a single Node process.
- **Worker** — separate image/process from the API. BullMQ global rate limit is
  10 req/s across all workers; concurrency is 5 in-flight checks per worker.
- **Web** — Next.js App Router. Batch pages load current state from Postgres on
  first paint, then subscribe to SSE.

## Horizontal scaling

API and worker are designed to run as multiple containers against the same Postgres
and Redis:

```bash
docker compose up --scale worker=3
```

The rate limiter is global (Redis-backed), so extra workers must not exceed 10 HTTP
checks per second combined. Multiple API instances share one Redis pub/sub channel
per batch so every SSE client sees the same events.

## Trade-offs

- Postgres over Redis for durable batch/URL state: a Redis flush or worker crash
  cannot lose results; list and detail views always rebuild from SQL.
- SSE + Redis pub/sub instead of WebSockets: reconnect is a first-class EventSource
  behavior, and any API instance can relay because it subscribes to Redis rather
  than holding exclusive client state.
- Shared Zod package (`@url-checker/shared`) instead of duplicated TypeScript
  interfaces: api, worker, and web import the same schemas.

## Assumptions

- CSV input: one URL per line, optional header row.
- Transient failure (retried): network error, timeout, or 5xx. 4xx is not retried.
- Page title: best-effort parse of the HTML `<title>` tag; skipped for non-HTML
  content types.
- A worker that dies mid-check leaves the row in `checking`; those rows are swept
  to `failed` after a timeout and can be retried with retry-failed.

## Out of scope

Auth, notifications, charts, and polished visual design.
