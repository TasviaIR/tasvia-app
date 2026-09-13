CREATE TABLE "ManufacturingBom" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "outputItemId" TEXT NOT NULL,
  "outputQuantity" BIGINT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ManufacturingBom_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ManufacturingBomLine" (
  "id" TEXT NOT NULL,
  "bomId" TEXT NOT NULL,
  "componentItemId" TEXT NOT NULL,
  "quantityMinorUnits" BIGINT NOT NULL,
  "wasteBasisPoints" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ManufacturingBomLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ManufacturingOrder" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "bomId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "plannedOutputQuantity" BIGINT NOT NULL,
  "actualOutputQuantity" BIGINT,
  "materialCost" BIGINT,
  "overheadCost" BIGINT NOT NULL DEFAULT 0,
  "laborCost" BIGINT NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdBy" TEXT NOT NULL,
  "completedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ManufacturingOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaxSubmission" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceDocumentId" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "taxpayerId" TEXT,
  "payloadHash" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "provider" TEXT NOT NULL DEFAULT 'MODIAN',
  "providerReference" TEXT,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "submittedAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TaxSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationTemplate" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "subject" TEXT,
  "body" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OperationalNotification" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "templateId" TEXT,
  "channel" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "subject" TEXT,
  "body" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "idempotencyKey" TEXT NOT NULL,
  "providerReference" TEXT,
  "errorMessage" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OperationalNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ManufacturingBom_workspaceId_code_key" ON "ManufacturingBom"("workspaceId","code");
CREATE INDEX "ManufacturingBom_workspaceId_active_idx" ON "ManufacturingBom"("workspaceId","active");
CREATE INDEX "ManufacturingBom_workspaceId_outputItemId_idx" ON "ManufacturingBom"("workspaceId","outputItemId");
CREATE INDEX "ManufacturingBomLine_bomId_idx" ON "ManufacturingBomLine"("bomId");
CREATE INDEX "ManufacturingBomLine_componentItemId_idx" ON "ManufacturingBomLine"("componentItemId");
CREATE UNIQUE INDEX "ManufacturingOrder_workspaceId_orderNumber_key" ON "ManufacturingOrder"("workspaceId","orderNumber");
CREATE INDEX "ManufacturingOrder_workspaceId_status_createdAt_idx" ON "ManufacturingOrder"("workspaceId","status","createdAt");
CREATE UNIQUE INDEX "TaxSubmission_workspaceId_idempotencyKey_key" ON "TaxSubmission"("workspaceId","idempotencyKey");
CREATE INDEX "TaxSubmission_workspaceId_status_createdAt_idx" ON "TaxSubmission"("workspaceId","status","createdAt");
CREATE INDEX "TaxSubmission_workspaceId_sourceDocumentId_idx" ON "TaxSubmission"("workspaceId","sourceDocumentId");
CREATE UNIQUE INDEX "NotificationTemplate_workspaceId_code_key" ON "NotificationTemplate"("workspaceId","code");
CREATE INDEX "NotificationTemplate_workspaceId_channel_active_idx" ON "NotificationTemplate"("workspaceId","channel","active");
CREATE UNIQUE INDEX "OperationalNotification_workspaceId_idempotencyKey_key" ON "OperationalNotification"("workspaceId","idempotencyKey");
CREATE INDEX "OperationalNotification_workspaceId_status_scheduledAt_idx" ON "OperationalNotification"("workspaceId","status","scheduledAt");

ALTER TABLE "ManufacturingBom" ADD CONSTRAINT "ManufacturingBom_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManufacturingBom" ADD CONSTRAINT "ManufacturingBom_outputItemId_fkey" FOREIGN KEY ("outputItemId") REFERENCES "CatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ManufacturingBomLine" ADD CONSTRAINT "ManufacturingBomLine_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "ManufacturingBom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManufacturingBomLine" ADD CONSTRAINT "ManufacturingBomLine_componentItemId_fkey" FOREIGN KEY ("componentItemId") REFERENCES "CatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ManufacturingOrder" ADD CONSTRAINT "ManufacturingOrder_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManufacturingOrder" ADD CONSTRAINT "ManufacturingOrder_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "ManufacturingBom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ManufacturingOrder" ADD CONSTRAINT "ManufacturingOrder_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaxSubmission" ADD CONSTRAINT "TaxSubmission_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationTemplate" ADD CONSTRAINT "NotificationTemplate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OperationalNotification" ADD CONSTRAINT "OperationalNotification_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
