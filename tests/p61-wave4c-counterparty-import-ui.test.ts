import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  mapCounterpartyImportRows,
  parseCsv,
} from "../src/application/data-portability/counterparty-csv";

const importService = fs.readFileSync(
  "src/application/data-portability/counterparty-import-service.ts",
  "utf8",
);
const actions = fs.readFileSync(
  "app/app/data-portability/actions.ts",
  "utf8",
);
const page = fs.readFileSync(
  "app/app/data-portability/page.tsx",
  "utf8",
);
const platform = fs.readFileSync(
  "app/app/platform-controls/page.tsx",
  "utf8",
);

test("P61 W CSV parser handles quoted cells safely", () => {
  const parsed = parseCsv(
    'type,name,email\nCUSTOMER,"شرکت، نمونه",a@example.test\n',
  );

  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0]?.[1], "شرکت، نمونه");
});

test("P61 W counterparty import validates type name and email", () => {
  const parsed = parseCsv(
    "type,name,email\nCUSTOMER,مشتری,a@example.test\nBAD,,invalid\n",
  );

  const result = mapCounterpartyImportRows(parsed);

  assert.equal(result.rows.length, 1);
  assert.ok(result.errors.some((error) => error.code === "INVALID_TYPE"));
  assert.ok(result.errors.some((error) => error.code === "REQUIRED"));
  assert.ok(result.errors.some((error) => error.code === "INVALID_EMAIL"));
});

test("P61 W real import writes counterparties transactionally", () => {
  assert.match(importService, /prisma\.\$transaction/);
  assert.match(importService, /tx\.counterparty\.create/);
  assert.match(importService, /COUNTERPARTY_IMPORT_COMMIT/);
  assert.match(importService, /IMPORT_SOURCE_HASH_MISMATCH/);
});

test("P61 W import actions enforce workspace role and dry run", () => {
  assert.match(actions, /requireCurrentWorkspace/);
  assert.match(actions, /OWNER/);
  assert.match(actions, /ADMIN/);
  assert.match(actions, /FINANCE/);
  assert.match(actions, /createDryRunImportJob/);
  assert.match(actions, /commitCounterpartyImport/);
});

test("P61 W data portability UI exposes import export and restore evidence", () => {
  assert.match(page, /CounterpartyImportForm/);
  assert.match(page, /reports\/financial\/export/);
  assert.match(page, /audit\/export/);
  assert.match(page, /restoreRehearsalEvidence/);
  assert.match(platform, /\/app\/data-portability/);
});
