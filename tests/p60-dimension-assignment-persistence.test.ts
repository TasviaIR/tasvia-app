import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("P60 dimension assignments persist against accounting journal lines", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");

  assert.match(schema, /model AccountingDimensionAssignment/);
  assert.match(schema, /journalLine\s+AccountingJournalLine\s+@relation/);
  assert.match(schema, /@@unique\(\[journalLineId, type\]\)/);
  assert.match(schema, /model AccountingDimensionAllocation/);
  assert.match(schema, /basisPoints\s+Int/);
});

test("P60 dimension assignment service reuses exact domain validation", () => {
  const source = readFileSync(
    "src/application/accounting/dimension-assignment-service.ts",
    "utf8",
  );

  assert.match(source, /validateDimensionAssignment\(/);
  assert.match(source, /assertWorkspaceWriteEntitlement\(input\.workspaceId\)/);
  assert.match(source, /DIMENSION_POSTED_JOURNAL_LOCKED/);
  assert.match(source, /status:\s*"DRAFT"/);
});

test("P60 dimension assignment replacement is atomic and workspace scoped", () => {
  const source = readFileSync(
    "src/application/accounting/dimension-assignment-service.ts",
    "utf8",
  );

  assert.match(source, /prisma\.\$transaction/);
  assert.match(source, /workspaceId:\s*input\.workspaceId/);
  assert.match(source, /journalLineId:\s*input\.journalLineId/);
  assert.match(source, /allocations:\s*\{\s*create:/);
});

test("P60 dimension assignment UI supports up to three exact allocations", () => {
  const page = readFileSync(
    "app/app/dimensions/assignments/page.tsx",
    "utf8",
  );
  const actions = readFileSync(
    "app/app/dimensions/assignments/actions.ts",
    "utf8",
  );

  assert.match(page, /\[1, 2, 3\]\.map/);
  assert.match(page, /مجموع درصدهای واردشده باید دقیقاً ۱۰۰٪ باشد/);
  assert.match(actions, /parsePercentToBasisPoints/);
  assert.match(actions, /basisPoints/);
});

test("P60 dimension report foundation uses only posted accounting truth", () => {
  const source = readFileSync(
    "src/application/accounting/dimension-assignment-service.ts",
    "utf8",
  );

  assert.match(source, /status:\s*"POSTED"/);
  assert.match(source, /projectAmountByDimension/);
  assert.match(source, /debit:/);
  assert.match(source, /credit:/);
});

test("P60 professional accounting exposes dimension assignment entry point", () => {
  const professional = readFileSync(
    "app/accounting/professional/page.tsx",
    "utf8",
  );
  const master = readFileSync("app/app/dimensions/page.tsx", "utf8");

  assert.match(professional, /\/app\/dimensions\/assignments/);
  assert.match(master, /\/app\/dimensions\/assignments/);
});
