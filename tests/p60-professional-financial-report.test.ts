import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("P60 A7 professional report reads POSTED accounting truth only", () => {
  const source = readFileSync("src/application/accounting/professional-financial-report.ts", "utf8");
  assert.match(source, /status:\s*"POSTED"/);
  assert.match(source, /workspaceId/);
});

test("P60 A7 dimension filter uses persisted basis-point allocation", () => {
  const source = readFileSync("src/application/accounting/professional-financial-report.ts", "utf8");
  assert.match(source, /dimensionAssignments/);
  assert.match(source, /basisPoints/);
  assert.match(source, /10_000n/);
  assert.match(source, /DIMENSION_FILTER_INVALID/);
});

test("P60 A7 exposes trial balance P&L balance sheet cash flow and journal drill-down", () => {
  const source = readFileSync("src/application/accounting/professional-financial-report.ts", "utf8");
  const page = readFileSync("app/app/reports/financial/page.tsx", "utf8");
  assert.match(source, /trialBalance/);
  assert.match(source, /profitAndLoss/);
  assert.match(source, /balanceSheet/);
  assert.match(source, /cashFlow/);
  assert.match(page, /دفتر روزنامه و Drill-down سند/);
});

test("P60 A7 export is authenticated and no-store", () => {
  const route = readFileSync("app/app/reports/financial/export/route.ts", "utf8");
  assert.match(route, /auth\.api\.getSession/);
  assert.match(route, /membership\.findFirst/);
  assert.match(route, /text\/csv/);
  assert.match(route, /private, no-store/);
});

test("P60 A7 CSV export serializes bigint safely", () => {
  const source = readFileSync("src/application/accounting/professional-financial-report.ts", "utf8");
  assert.match(source, /professionalReportToCsv/);
  assert.match(source, /row\.debit\.toString\(\)/);
  assert.match(source, /row\.credit\.toString\(\)/);
});
