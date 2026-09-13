-- CreateEnum
CREATE TYPE "PayrollRunStatus" AS ENUM ('DRAFT', 'FINALIZED', 'PAID');

-- CreateEnum
CREATE TYPE "FixedAssetStatus" AS ENUM ('ACTIVE', 'DISPOSED');

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nationalId" TEXT,
    "mobile" TEXT,
    "baseSalary" BIGINT NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "PayrollRunStatus" NOT NULL DEFAULT 'DRAFT',
    "finalizedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollLine" (
    "id" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "grossPay" BIGINT NOT NULL,
    "deductions" BIGINT NOT NULL DEFAULT 0,
    "netPay" BIGINT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedAsset" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "acquisitionDate" TIMESTAMP(3) NOT NULL,
    "acquisitionCost" BIGINT NOT NULL,
    "residualValue" BIGINT NOT NULL DEFAULT 0,
    "usefulLifeMonths" INTEGER NOT NULL,
    "status" "FixedAssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FixedAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetDepreciation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "periodDate" TIMESTAMP(3) NOT NULL,
    "amount" BIGINT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetDepreciation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Employee_workspaceId_active_name_idx" ON "Employee"("workspaceId", "active", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_workspaceId_employeeCode_key" ON "Employee"("workspaceId", "employeeCode");

-- CreateIndex
CREATE INDEX "PayrollRun_workspaceId_periodStart_periodEnd_idx" ON "PayrollRun"("workspaceId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "PayrollRun_workspaceId_status_idx" ON "PayrollRun"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "PayrollLine_employeeId_idx" ON "PayrollLine"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollLine_payrollRunId_employeeId_key" ON "PayrollLine"("payrollRunId", "employeeId");

-- CreateIndex
CREATE INDEX "FixedAsset_workspaceId_status_acquisitionDate_idx" ON "FixedAsset"("workspaceId", "status", "acquisitionDate");

-- CreateIndex
CREATE UNIQUE INDEX "FixedAsset_workspaceId_code_key" ON "FixedAsset"("workspaceId", "code");

-- CreateIndex
CREATE INDEX "AssetDepreciation_workspaceId_periodDate_idx" ON "AssetDepreciation"("workspaceId", "periodDate");

-- CreateIndex
CREATE UNIQUE INDEX "AssetDepreciation_assetId_periodDate_key" ON "AssetDepreciation"("assetId", "periodDate");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollLine" ADD CONSTRAINT "PayrollLine_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollLine" ADD CONSTRAINT "PayrollLine_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedAsset" ADD CONSTRAINT "FixedAsset_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetDepreciation" ADD CONSTRAINT "AssetDepreciation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetDepreciation" ADD CONSTRAINT "AssetDepreciation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FixedAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
