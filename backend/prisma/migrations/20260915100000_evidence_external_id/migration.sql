-- Add externalId to Evidence for collector deduplication
ALTER TABLE "Evidence" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Evidence_collectorId_externalId_key" ON "Evidence"("collectorId", "externalId");
