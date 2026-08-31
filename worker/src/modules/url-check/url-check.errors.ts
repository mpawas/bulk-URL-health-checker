import { UnrecoverableError } from "bullmq";

/** Network, timeout, and 5xx are retried. 4xx is not. */
export function isTransientStatus(statusCode: number): boolean {
  return statusCode >= 500;
}

export function failureForStatus(statusCode: number): Error {
  if (statusCode >= 400 && statusCode < 500) {
    return new UnrecoverableError(`HTTP ${statusCode} is not retried`);
  }
  return new Error(`HTTP ${statusCode}`);
}
