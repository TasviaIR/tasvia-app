import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("P61 commercial hub uses persisted product truth and real routes", () => {
  const source = readFileSync("app/app/commercial-controls/page.tsx", "utf8");
  assert.match(source, /counterparty\.count/);
  assert.match(source, /salesInvoice\.count/);
  assert.match(source, /purchaseInvoice\.count/);
  assert.match(source, /catalogItem\.count/);
  assert.match(source, /\/app\/sales/);
  assert.match(source, /\/app\/purchases/);
  assert.match(source, /\/app\/treasury/);
  assert.match(source, /createPriceLevelAction/);
  assert.match(source, /createDiscountRuleAction/);
});

test("P61 operations hub exposes real persisted advanced modules", () => {
  const source = readFileSync("app/app/operations-controls/page.tsx", "utf8");
  assert.match(source, /financialEvidence\.count/);
  assert.match(source, /payrollRun\.count/);
  assert.match(source, /fixedAsset\.count/);
  assert.match(source, /fiscalPeriod\.count/);
  assert.match(source, /auditEvent\.count/);
});

test("P61 platform hub exposes real API security and entitlement routes", () => {
  const source = readFileSync("app/app/platform-controls/page.tsx", "utf8");
  assert.match(source, /apiKey\.count/);
  assert.match(source, /membership\.count/);
  assert.match(source, /\/app\/api-keys/);
  assert.match(source, /\/app\/subscription/);
  assert.match(source, /\/app\/audit/);
});
