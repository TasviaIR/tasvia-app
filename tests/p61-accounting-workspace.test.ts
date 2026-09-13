import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("P61 accounting control center uses persisted accounting truth", () => {
  const source = readFileSync("app/app/accounting/page.tsx", "utf8");
  assert.match(source, /accountingAccount\.count/);
  assert.match(source, /accountingJournal\.findMany/);
  assert.match(source, /fiscalPeriod\.findMany/);
  assert.match(source, /\/app\/accounting\/chart/);
  assert.match(source, /\/app\/accounting\/journals/);
  assert.match(source, /\/app\/accounting\/ledger/);
});

test("P61 chart of accounts exposes hierarchy and account nature", () => {
  const source = readFileSync("app/app/accounting/chart/page.tsx", "utf8");
  assert.match(source, /parent:\s*true/);
  assert.match(source, /children:\s*true/);
  assert.match(source, /دارایی/);
  assert.match(source, /حقوق مالکانه/);
});

test("P61 journal book shows debit credit lines and balance invariant", () => {
  const source = readFileSync("app/app/accounting/journals/page.tsx", "utf8");
  assert.match(source, /line\.debit/);
  assert.match(source, /line\.credit/);
  assert.match(source, /debit === credit/);
  assert.match(source, /سند متوازن/);
});

test("P61 ledger reads posted journals only", () => {
  const source = readFileSync("app/app/accounting/ledger/page.tsx", "utf8");
  assert.match(source, /status:\s*"POSTED"/);
  assert.match(source, /runningBalance: previous \+ line\.debit - line\.credit/);
});

test("P61 professional accounting cards are real links", () => {
  const source = readFileSync("app/accounting/professional/page.tsx", "utf8");
  assert.match(source, /\/app\/accounting\/journals/);
  assert.match(source, /\/app\/accounting\/ledger/);
  assert.match(source, /\/app\/reports\/financial/);
  assert.match(source, /<Link key=/);
});
