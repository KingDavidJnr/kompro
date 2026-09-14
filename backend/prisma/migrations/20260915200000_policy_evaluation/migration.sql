-- Add PolicyEvaluation table for policy-as-code evaluation results
CREATE TABLE IF NOT EXISTS "PolicyEvaluation" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "passedCount" INTEGER NOT NULL,
    "failedCount" INTEGER NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "conditions" JSONB NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PolicyEvaluation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PolicyEvaluation_policyId_idx" ON "PolicyEvaluation"("policyId");
CREATE INDEX IF NOT EXISTS "PolicyEvaluation_result_idx" ON "PolicyEvaluation"("result");
ALTER TABLE "PolicyEvaluation" ADD CONSTRAINT "PolicyEvaluation_policyId_fkey"
    FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
