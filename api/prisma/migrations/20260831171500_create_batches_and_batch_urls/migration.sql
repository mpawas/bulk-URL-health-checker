-- CreateTable
CREATE TABLE "batches" (
    "id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "total_urls" INTEGER NOT NULL,
    "completed_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_urls" (
    "id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "status_code" INTEGER,
    "response_time_ms" INTEGER,
    "page_title" TEXT,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batch_urls_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "batch_urls" ADD CONSTRAINT "batch_urls_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
