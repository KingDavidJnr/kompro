-- Add many-to-many join tables for Evidence <-> Control and Evidence <-> Policy
CREATE TABLE IF NOT EXISTS "EvidenceControl" (
    "evidenceId" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    CONSTRAINT "EvidenceControl_pkey" PRIMARY KEY ("evidenceId","controlId")
);
CREATE INDEX IF NOT EXISTS "EvidenceControl_controlId_idx" ON "EvidenceControl"("controlId");
ALTER TABLE "EvidenceControl" ADD CONSTRAINT "EvidenceControl_evidenceId_fkey"
    FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EvidenceControl" ADD CONSTRAINT "EvidenceControl_controlId_fkey"
    FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "EvidencePolicy" (
    "evidenceId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    CONSTRAINT "EvidencePolicy_pkey" PRIMARY KEY ("evidenceId","policyId")
);
CREATE INDEX IF NOT EXISTS "EvidencePolicy_policyId_idx" ON "EvidencePolicy"("policyId");
ALTER TABLE "EvidencePolicy" ADD CONSTRAINT "EvidencePolicy_evidenceId_fkey"
    FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EvidencePolicy" ADD CONSTRAINT "EvidencePolicy_policyId_fkey"
    FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
