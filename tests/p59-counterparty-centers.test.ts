import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("P59 customer and supplier centers use accounting truth", () => {
  const shell = readFileSync("src/components/workspace/shell.tsx","utf8");
  const customers = readFileSync("app/app/customers/page.tsx","utf8");
  const suppliers = readFileSync("app/app/suppliers/page.tsx","utf8");
  const service = readFileSync("src/application/counterparties/counterparty-center-service.ts","utf8");
  assert.ok(shell.includes('"/app/customers"'));
  assert.ok(customers.includes("getCounterpartyCenter"));
  assert.ok(suppliers.includes("getCounterpartyCenter"));
  assert.ok(service.includes("prisma.counterparty.findMany"));
  assert.ok(service.includes("prisma.openBalance.findMany"));
});

test("P59 removes supplier placeholder UX and keeps creation non-financial", () => {
  const suppliers = readFileSync("app/app/suppliers/page.tsx","utf8");
  const actions = readFileSync("app/app/counterparties/actions.ts","utf8");
  assert.equal(suppliers.includes("در انتظار داده"),false);
  assert.equal(suppliers.includes("تأمین‌کننده نمونه"),false);
  assert.ok(actions.includes("prisma.counterparty.create"));
  assert.equal(actions.includes("accountingJournal.create"),false);
});
