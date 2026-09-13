import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("app/app/fiscal-close/page.tsx", "utf8");
const service = readFileSync("src/application/accounting/fiscal-close-service.ts", "utf8");

test("P60 fiscal close UI loads workspace-scoped reopen audit history", () => {
  assert.match(page, /listFiscalReopenAudits\(current\.workspace\.id, p\.id\)/);
  assert.match(page, /data-testid="fiscal-reopen-audit-history"/);
  assert.match(page, /data-testid="fiscal-reopen-audit-empty"/);
});

test("P60 fiscal reopen history exposes audit reason actor and timestamp", () => {
  assert.match(page, /audit\.reason/);
  assert.match(page, /audit\.actorId/);
  assert.match(page, /audit\.occurredAt\.toISOString\(\)/);
  assert.match(page, /audit\.beforeStatus/);
  assert.match(page, /audit\.afterStatus/);
});

test("P60 fiscal reopen audit reader is fail-closed to workspace and period", () => {
  assert.match(service, /where:\s*\{\s*workspaceId,\s*fiscalPeriodId\s*\}/);
  assert.match(service, /orderBy:\s*\{\s*occurredAt:\s*"desc"\s*\}/);
  assert.match(service, /take:\s*100/);
});
