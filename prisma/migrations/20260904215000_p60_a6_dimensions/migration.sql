CREATE TYPE "AccountingDimensionType" AS ENUM ('BRANCH', 'COST_CENTER', 'PROJECT');

CREATE TABLE "AccountingDimensionValue" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "AccountingDimensionType" NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingDimensionValue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountingDimensionValue_workspaceId_type_code_key"
ON "AccountingDimensionValue"("workspaceId", "type", "code");

CREATE INDEX "AccountingDimensionValue_workspaceId_type_active_idx"
ON "AccountingDimensionValue"("workspaceId", "type", "active");

CREATE INDEX "AccountingDimensionValue_workspaceId_name_idx"
ON "AccountingDimensionValue"("workspaceId", "name");

ALTER TABLE "AccountingDimensionValue"
ADD CONSTRAINT "AccountingDimensionValue_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
