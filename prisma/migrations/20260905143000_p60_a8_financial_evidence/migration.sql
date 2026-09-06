CREATE TABLE "FinancialEvidence" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sourceEntityType" TEXT NOT NULL,
    "sourceEntityId" TEXT NOT NULL,
    "journalId" TEXT,
    "safeFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "description" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "archivedBy" TEXT,
    "archiveReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinancialEvidence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinancialEvidence_workspaceId_sha256_storageKey_key"
ON "FinancialEvidence"("workspaceId","sha256","storageKey");

CREATE INDEX "FinancialEvidence_workspaceId_sourceEntityType_sourceEntityId_createdAt_idx"
ON "FinancialEvidence"("workspaceId","sourceEntityType","sourceEntityId","createdAt");

CREATE INDEX "FinancialEvidence_workspaceId_category_createdAt_idx"
ON "FinancialEvidence"("workspaceId","category","createdAt");

CREATE INDEX "FinancialEvidence_workspaceId_journalId_idx"
ON "FinancialEvidence"("workspaceId","journalId");

CREATE INDEX "FinancialEvidence_workspaceId_archivedAt_idx"
ON "FinancialEvidence"("workspaceId","archivedAt");

ALTER TABLE "FinancialEvidence"
ADD CONSTRAINT "FinancialEvidence_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
