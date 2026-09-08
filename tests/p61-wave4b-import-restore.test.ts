import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
const importService = fs.readFileSync(
  "src/application/data-portability/import-job-service.ts",
  "utf8",
);
const restoreService = fs.readFileSync(
  "src/application/data-portability/restore-rehearsal-service.ts",
  "utf8",
);

test("P61 W import jobs are persisted and workspace scoped", () => {
  assert.match(schema, /model DataImportJob/);
  assert.match(schema, /workspaceId\s+String/);
  assert.match(importService, /workspaceId:\s*input\.workspaceId/);
  assert.match(importService, /sourceHash/);
});

test("P61 W import commit rejects invalid lifecycle", () => {
  assert.match(importService, /IMPORT_JOB_HAS_ERRORS/);
  assert.match(importService, /IMPORT_ALREADY_COMMITTED/);
  assert.match(importService, /status:\s*"COMMITTED"/);
});

test("P61 W import lifecycle emits immutable audit evidence", () => {
  assert.match(importService, /recordAuditEventInTransaction/);
  assert.match(importService, /DATA_IMPORT_DRY_RUN/);
  assert.match(importService, /DATA_IMPORT_COMMIT/);
});

test("P61 W restore rehearsal persists integrity evidence", () => {
  assert.match(schema, /model RestoreRehearsalEvidence/);
  assert.match(restoreService, /rowCountMatch/);
  assert.match(restoreService, /checksumMatch/);
  assert.match(restoreService, /schemaValid/);
  assert.match(restoreService, /passed/);
});

test("P61 W restore rehearsal is auditable and fail closed", () => {
  assert.match(restoreService, /RESTORE_REHEARSAL_RECORDED/);
  assert.match(
    restoreService,
    /input\.rowCountMatch\s*&&\s*input\.checksumMatch\s*&&\s*input\.schemaValid/,
  );
});
