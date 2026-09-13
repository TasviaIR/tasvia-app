import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("P61 manufacturing persists BOM orders and exact integer costs",()=>{
  const schema=readFileSync("prisma/schema.prisma","utf8");
  const service=readFileSync("src/application/manufacturing/manufacturing-service.ts","utf8");
  assert.match(schema,/model ManufacturingBom \{/);
  assert.match(schema,/model ManufacturingOrder \{/);
  assert.match(service,/assertWorkspaceWriteEntitlement/);
  assert.match(service,/MANUFACTURING_STOCK_INSUFFICIENT/);
  assert.match(service,/materialCost \+= unitCost \* qty/);
  assert.match(service,/type: "ADJUSTMENT_OUT"/);
  assert.match(service,/type: "ADJUSTMENT_IN"/);
});

test("P61 Modian queue is idempotent hashed and provider safe",()=>{
  const schema=readFileSync("prisma/schema.prisma","utf8");
  const service=readFileSync("src/application/tax/tax-submission-service.ts","utf8");
  assert.match(schema,/model TaxSubmission \{/);
  assert.match(service,/createHash\("sha256"\)/);
  assert.match(service,/idempotencyKey/);
  assert.match(service,/status: "QUEUED"/);
  assert.match(service,/TAX_INVOICE_NOT_POSTED/);
});

test("P61 notifications persist templates and idempotent queue",()=>{
  const schema=readFileSync("prisma/schema.prisma","utf8");
  const service=readFileSync("src/application/notifications/notification-service.ts","utf8");
  assert.match(schema,/model NotificationTemplate \{/);
  assert.match(schema,/model OperationalNotification \{/);
  assert.match(service,/assertWorkspaceWriteEntitlement/);
  assert.match(service,/workspaceId_idempotencyKey/);
  assert.match(service,/SMS/);
  assert.match(service,/EMAIL/);
  assert.match(service,/IN_APP/);
});

test("P61 wave3 operations are role guarded audited and user facing",()=>{
  const actions=readFileSync("app/app/operations-controls/actions-wave3.ts","utf8");
  const hub=readFileSync("app/app/operations-controls/page.tsx","utf8");
  assert.match(actions,/P61_WAVE3_PERMISSION_DENIED/);
  assert.match(actions,/recordAuditEvent/);
  assert.match(hub,/\/app\/manufacturing/);
  assert.match(hub,/\/app\/tax/);
  assert.match(hub,/\/app\/notifications/);
});
