CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRole" TEXT,
    "actorType" TEXT NOT NULL DEFAULT 'USER',
    "action" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "requestId" TEXT,
    "reason" TEXT,
    "beforeState" JSONB,
    "afterState" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditEvent_workspaceId_createdAt_idx" ON "AuditEvent"("workspaceId","createdAt");
CREATE INDEX "AuditEvent_workspaceId_actorId_createdAt_idx" ON "AuditEvent"("workspaceId","actorId","createdAt");
CREATE INDEX "AuditEvent_workspaceId_action_createdAt_idx" ON "AuditEvent"("workspaceId","action","createdAt");
CREATE INDEX "AuditEvent_workspaceId_category_createdAt_idx" ON "AuditEvent"("workspaceId","category","createdAt");
CREATE INDEX "AuditEvent_workspaceId_entityType_entityId_createdAt_idx" ON "AuditEvent"("workspaceId","entityType","entityId","createdAt");
CREATE INDEX "AuditEvent_requestId_idx" ON "AuditEvent"("requestId");

ALTER TABLE "AuditEvent"
ADD CONSTRAINT "AuditEvent_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION tasvin_prevent_audit_event_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditEvent is immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AuditEvent_prevent_update"
BEFORE UPDATE ON "AuditEvent"
FOR EACH ROW EXECUTE FUNCTION tasvin_prevent_audit_event_mutation();

CREATE TRIGGER "AuditEvent_prevent_delete"
BEFORE DELETE ON "AuditEvent"
FOR EACH ROW EXECUTE FUNCTION tasvin_prevent_audit_event_mutation();
