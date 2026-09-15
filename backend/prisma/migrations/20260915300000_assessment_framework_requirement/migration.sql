-- Update Assessment: add frameworkId, requirementId, status; make result nullable; remove default on assessmentDate
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "frameworkId" TEXT;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "requirementId" TEXT;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "Assessment" ALTER COLUMN "result" DROP NOT NULL;
ALTER TABLE "Assessment" ALTER COLUMN "assessmentDate" DROP DEFAULT;

CREATE INDEX IF NOT EXISTS "Assessment_frameworkId_idx" ON "Assessment"("frameworkId");
CREATE INDEX IF NOT EXISTS "Assessment_requirementId_idx" ON "Assessment"("requirementId");
CREATE INDEX IF NOT EXISTS "Assessment_status_idx" ON "Assessment"("status");
