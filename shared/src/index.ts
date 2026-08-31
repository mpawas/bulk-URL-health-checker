import { z } from "zod";

// Mirrors the batches table (Module 1). Single definition — api, worker, and web
// all import from here instead of maintaining separate interfaces.
export const BatchStatus = z.enum([
  "pending",
  "running",
  "completed",
  "cancelled",
]);
export type BatchStatus = z.infer<typeof BatchStatus>;

export const BatchUrlStatus = z.enum([
  "queued",
  "checking",
  "completed",
  "failed",
  "cancelled",
]);
export type BatchUrlStatus = z.infer<typeof BatchUrlStatus>;

export const BatchSchema = z.object({
  id: z.string().uuid(),
  status: BatchStatus,
  totalUrls: z.number().int().nonnegative(),
  completedCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Batch = z.infer<typeof BatchSchema>;

export const BatchUrlSchema = z.object({
  id: z.string().uuid(),
  batchId: z.string().uuid(),
  url: z.string().url(),
  status: BatchUrlStatus,
  statusCode: z.number().int().nullable(),
  responseTimeMs: z.number().int().nullable(),
  pageTitle: z.string().nullable(),
  attemptCount: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
});
export type BatchUrl = z.infer<typeof BatchUrlSchema>;

export const CreateBatchRequestSchema = z.object({
  urls: z.array(z.string().url()).min(1),
});
export type CreateBatchRequest = z.infer<typeof CreateBatchRequestSchema>;

export const EnqueueFailureSchema = z.object({
  batchUrlId: z.string().uuid(),
  url: z.string().url(),
  message: z.string(),
});
export type EnqueueFailure = z.infer<typeof EnqueueFailureSchema>;

export const CreateBatchResponseSchema = z.object({
  batchId: z.string().uuid(),
  totalUrls: z.number().int().nonnegative(),
  status: BatchStatus,
  trackingUrl: z.string().min(1),
  enqueueFailures: z.array(EnqueueFailureSchema),
});
export type CreateBatchResponse = z.infer<typeof CreateBatchResponseSchema>;

export const UrlCheckJobDataSchema = z.object({
  batchUrlId: z.string().uuid(),
  batchId: z.string().uuid(),
  url: z.string().url(),
});
export type UrlCheckJobData = z.infer<typeof UrlCheckJobDataSchema>;
  type: z.enum(["snapshot", "url_update"]),
  batch: BatchSchema,
  urls: z.array(BatchUrlSchema),
});
export type BatchEvent = z.infer<typeof BatchEventSchema>;
