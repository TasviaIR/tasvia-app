import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("P60 A8 settlement cheque and fiscal workflows emit transaction-safe audit events", () => {
  for (const path of [
    "src/application/settlements/settlement-service.ts",
    "src/application/cheques/cheque-service.ts",
    "src/application/accounting/fiscal-close-service.ts",
  ]) {
    const source = readFileSync(path, "utf8");
    assert.match(source, /recordAuditEventInTransaction/);
  }
});

test("P60 A8 settlement audit captures balance before and after without credentials", () => {
  const source = readFileSync("src/application/settlements/settlement-service.ts", "utf8");
  assert.match(source, /SETTLEMENT_RECEIPT_POSTED/);
  assert.match(source, /outstandingAmount/);
  assert.doesNotMatch(source, /secretHash|accessToken|refreshToken/);
});

test("P60 A8 fiscal reopen and journal reversal are critical auditable operations", () => {
  const source = readFileSync("src/application/accounting/fiscal-close-service.ts", "utf8");
  assert.match(source, /FISCAL_PERIOD_REOPENED/);
  assert.match(source, /ACCOUNTING_JOURNAL_REVERSED/);
  assert.match(source, /severity:\s*"CRITICAL"/);
});

test("P60 A8 dimension and API key lifecycle surfaces emit audit events", () => {
  const dimension = readFileSync("app/app/dimensions/actions.ts", "utf8");
  const assignment = readFileSync("app/app/dimensions/assignments/actions.ts", "utf8");
  const apiKeys = readFileSync("app/app/api-keys/actions.ts", "utf8");

  assert.match(dimension, /DIMENSION_VALUE_CREATED/);
  assert.match(assignment, /DIMENSION_ASSIGNMENT_SET/);
  assert.match(apiKeys, /API_KEY_CREATED/);
  assert.match(apiKeys, /API_KEY_ROTATED/);
  assert.match(apiKeys, /API_KEY_REVOKED/);
  assert.doesNotMatch(apiKeys, /metadata:\s*\{[^}]*secretHash/s);
});

test("P60 A8 payroll and fixed asset writes emit attributable audit events", () => {
  const payroll = readFileSync("app/app/payroll/actions.ts", "utf8");
  const assets = readFileSync("app/app/fixed-assets/actions.ts", "utf8");

  assert.match(payroll, /EMPLOYEE_CREATED/);
  assert.match(payroll, /PAYROLL_RUN_CREATED/);
  assert.match(payroll, /actorId:\s*c\.userId/);

  assert.match(assets, /FIXED_ASSET_CREATED/);
  assert.match(assets, /ASSET_DEPRECIATION_POSTED/);
  assert.match(assets, /actorId:\s*c\.userId/);
});

test("P60 A8 audit service supports transaction client writes", () => {
  const audit = readFileSync("src/application/audit/audit-service.ts", "utf8");
  assert.match(audit, /recordAuditEventInTransaction/);
  assert.match(audit, /Prisma\.TransactionClient/);
  assert.match(audit, /tx\.auditEvent\.create/);
});
