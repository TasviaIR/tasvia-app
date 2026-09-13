CREATE TABLE "AccountingDimensionAssignment" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "journalLineId" TEXT NOT NULL,
    "type" "AccountingDimensionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingDimensionAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccountingDimensionAllocation" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "dimensionValueId" TEXT NOT NULL,
    "basisPoints" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountingDimensionAllocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountingDimensionAssignment_journalLineId_type_key"
ON "AccountingDimensionAssignment"("journalLineId", "type");

CREATE INDEX "AccountingDimensionAssignment_workspaceId_type_idx"
ON "AccountingDimensionAssignment"("workspaceId", "type");

CREATE INDEX "AccountingDimensionAssignment_workspaceId_journalLineId_idx"
ON "AccountingDimensionAssignment"("workspaceId", "journalLineId");

CREATE UNIQUE INDEX "AccountingDimensionAllocation_assignmentId_dimensionValueId_key"
ON "AccountingDimensionAllocation"("assignmentId", "dimensionValueId");

CREATE INDEX "AccountingDimensionAllocation_dimensionValueId_idx"
ON "AccountingDimensionAllocation"("dimensionValueId");

ALTER TABLE "AccountingDimensionAssignment"
ADD CONSTRAINT "AccountingDimensionAssignment_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AccountingDimensionAssignment"
ADD CONSTRAINT "AccountingDimensionAssignment_journalLineId_fkey"
FOREIGN KEY ("journalLineId") REFERENCES "AccountingJournalLine"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AccountingDimensionAllocation"
ADD CONSTRAINT "AccountingDimensionAllocation_assignmentId_fkey"
FOREIGN KEY ("assignmentId") REFERENCES "AccountingDimensionAssignment"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AccountingDimensionAllocation"
ADD CONSTRAINT "AccountingDimensionAllocation_dimensionValueId_fkey"
FOREIGN KEY ("dimensionValueId") REFERENCES "AccountingDimensionValue"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
