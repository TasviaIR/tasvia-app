-- P61 schema drift reconciliation
-- Forward-only migration.
-- Aligns historical migrations with the reviewed Prisma schema.
-- No data mutation.

CREATE INDEX IF NOT EXISTS "CommercialDiscountRule_workspaceId_active_idx"
ON "CommercialDiscountRule"("workspaceId", "active");

CREATE INDEX IF NOT EXISTS "CommercialPriceLevel_workspaceId_active_idx"
ON "CommercialPriceLevel"("workspaceId", "active");

CREATE INDEX IF NOT EXISTS "CommissionRule_workspaceId_active_idx"
ON "CommissionRule"("workspaceId", "active");

CREATE INDEX IF NOT EXISTS "CurrencyRate_workspaceId_currency_active_effectiveAt_idx"
ON "CurrencyRate"("workspaceId", "currency", "active", "effectiveAt");

CREATE INDEX IF NOT EXISTS "InstallmentPlan_workspaceId_active_idx"
ON "InstallmentPlan"("workspaceId", "active");

-- Historical FinancialEvidence migration created the same logical index
-- under a different generated name. Normalize it to the Prisma schema name.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'FinancialEvidence'
      AND indexname = 'FinancialEvidence_workspaceId_sourceEntityType_sourceEntityId_c'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'FinancialEvidence'
      AND indexname = 'FinancialEvidence_workspaceId_sourceEntityType_sourceEntity_idx'
  ) THEN
    ALTER INDEX "FinancialEvidence_workspaceId_sourceEntityType_sourceEntityId_c"
      RENAME TO "FinancialEvidence_workspaceId_sourceEntityType_sourceEntity_idx";
  END IF;
END $$;

-- These historical foreign keys are not represented by Prisma relations in
-- the reviewed schema. Remove only the constraints; the scalar ID columns stay.
ALTER TABLE "ManufacturingBom"
DROP CONSTRAINT IF EXISTS "ManufacturingBom_outputItemId_fkey";

ALTER TABLE "ManufacturingBomLine"
DROP CONSTRAINT IF EXISTS "ManufacturingBomLine_componentItemId_fkey";

ALTER TABLE "ManufacturingOrder"
DROP CONSTRAINT IF EXISTS "ManufacturingOrder_warehouseId_fkey";
