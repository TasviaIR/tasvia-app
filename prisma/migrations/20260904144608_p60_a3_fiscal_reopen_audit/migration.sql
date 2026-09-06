-- CreateTable
CREATE TABLE "FiscalReopenAudit" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "fiscalPeriodId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "beforeStatus" "FiscalPeriodStatus" NOT NULL,
    "afterStatus" "FiscalPeriodStatus" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FiscalReopenAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FiscalReopenAudit_workspaceId_fiscalPeriodId_occurredAt_idx" ON "FiscalReopenAudit"("workspaceId", "fiscalPeriodId", "occurredAt");

-- CreateIndex
CREATE INDEX "FiscalReopenAudit_workspaceId_actorId_occurredAt_idx" ON "FiscalReopenAudit"("workspaceId", "actorId", "occurredAt");

-- AddForeignKey
ALTER TABLE "FiscalReopenAudit" ADD CONSTRAINT "FiscalReopenAudit_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiscalReopenAudit" ADD CONSTRAINT "FiscalReopenAudit_fiscalPeriodId_fkey" FOREIGN KEY ("fiscalPeriodId") REFERENCES "FiscalPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
