-- CreateIndex
CREATE INDEX "batches_status_idx" ON "batches"("status");

-- CreateIndex
CREATE INDEX "batch_urls_batch_id_idx" ON "batch_urls"("batch_id");

-- CreateIndex
CREATE INDEX "batch_urls_status_idx" ON "batch_urls"("status");

-- CreateIndex
CREATE INDEX "batch_urls_batch_id_status_idx" ON "batch_urls"("batch_id", "status");
