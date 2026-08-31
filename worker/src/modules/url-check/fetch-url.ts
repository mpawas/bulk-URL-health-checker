import { fetch } from "undici";

const FETCH_TIMEOUT_MS = 10_000;

export type FetchedUrl = {
  statusCode: number | null;
  responseTimeMs: number;
  contentType: string | null;
  body: string | null;
  networkError: boolean;
};

export async function fetchUrl(url: string): Promise<FetchedUrl> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const started = Date.now();

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "bulk-url-checker/0.0.1" },
    });
    const responseTimeMs = Date.now() - started;
    const contentType = response.headers.get("content-type");
    let body: string | null = null;
    if (contentType?.includes("text/html")) {
      const text = await response.text();
      body = text.slice(0, 100_000);
    } else {
      await response.body?.cancel();
    }
    return {
      statusCode: response.status,
      responseTimeMs,
      contentType,
      body,
      networkError: false,
    };
  } catch {
    return {
      statusCode: null,
      responseTimeMs: Date.now() - started,
      contentType: null,
      body: null,
      networkError: true,
    };
  } finally {
    clearTimeout(timeout);
  }
}
