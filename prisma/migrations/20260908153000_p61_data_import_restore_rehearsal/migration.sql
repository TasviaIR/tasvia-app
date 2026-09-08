CREATE TABLE "DataImportJob" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "acceptedRows" INTEGER NOT NULL,
    "rejectedRows" INTEGER NOT NULL,
    "errorReport" JSONB,
    "committedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataImportJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RestoreRehearsalEvidence" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "backupChecksum" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "rowCountMatch" BOOLEAN NOT NULL,
    "checksumMatch" BOOLEAN NOT NULL,
    "schemaValid" BOOLEAN NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestoreRehearsalEvidence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DataImportJob_workspaceId_createdAt_idx"
ON "DataImportJob"("workspaceId", "createdAt");

CREATE INDEX "DataImportJob_workspaceId_status_idx"
ON "DataImportJob"("workspaceId", "status");

CREATE INDEX "RestoreRehearsalEvidence_workspaceId_createdAt_idx"
ON "RestoreRehearsalEvidence"("workspaceId", "createdAt");

ALTER TABLE "DataImportJob"
ADD CONSTRAINT "DataImportJob_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RestoreRehearsalEvidence"
ADD CONSTRAINT "RestoreRehearsalEvidence_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
