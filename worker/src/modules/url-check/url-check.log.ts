function short(id: string): string {
  return id.slice(0, 8);
}

/** One-line worker logs so docker compose follow reads as a check story. */
export function logCheck(
  event: string,
  fields: {
    batch?: string;
    url?: string;
    attempt?: number;
    maxAttempts?: number;
    http?: number | null;
    ms?: number | null;
    title?: string | null;
    reason?: string;
  },
): void {
  const bits: string[] = [`[url-check] ${event.padEnd(10)}`];
  if (fields.batch) {
    bits.push(`batch=${short(fields.batch)}`);
  }
  if (fields.attempt !== undefined && fields.maxAttempts !== undefined) {
    bits.push(`attempt=${fields.attempt}/${fields.maxAttempts}`);
  }
  if (fields.http !== undefined && fields.http !== null) {
    bits.push(`http=${fields.http}`);
  }
  if (fields.ms !== undefined && fields.ms !== null) {
    bits.push(`${fields.ms}ms`);
  }
  if (fields.reason) {
    bits.push(fields.reason);
  }
  if (fields.title) {
    bits.push(`title=${JSON.stringify(fields.title)}`);
  }
  if (fields.url) {
    bits.push(fields.url);
  }
  console.log(bits.join("  "));
}
