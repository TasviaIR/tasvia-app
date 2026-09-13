import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  parseJalaliDate,
  toJalaliInputValue,
} from "../src/lib/tasvin-date";

test("P61 global Jalali contract converts Solar Hijri input to canonical Date", () => {
  const parsed = parseJalaliDate("1405/01/01");

  assert.ok(parsed instanceof Date);
  assert.equal(Number.isNaN(parsed.getTime()), false);

  const roundTrip = toJalaliInputValue(parsed);

  assert.equal(roundTrip, "1405/01/01");
});

test("P61 global Jalali contract supports Persian digits", () => {
  const parsed = parseJalaliDate("۱۴۰۵/۰۱/۰۱");

  assert.ok(parsed instanceof Date);
  assert.equal(Number.isNaN(parsed.getTime()), false);
  assert.equal(toJalaliInputValue(parsed), "1405/01/01");
});

test("P61 global Jalali input is centralized and never falls back to native date", () => {
  const component = readFileSync(
    "src/components/date/jalali-date-input.tsx",
    "utf8",
  );

  assert.match(component, /TASVIN_DATE_PLACEHOLDER/);
  assert.match(component, /type="text"/);
  assert.doesNotMatch(component, /type="date"/);
});

test("P61 onboarding fiscal dates use the centralized Jalali boundary", () => {
  const page = readFileSync("app/onboarding/page.tsx", "utf8");
  const actions = readFileSync("app/onboarding/actions.ts", "utf8");

  assert.match(page, /JalaliDateInput/);
  assert.match(page, /toJalaliInputValue/);
  assert.match(actions, /parseJalaliDate/);

  assert.doesNotMatch(
    page,
    /fiscalYear(?:Starts|Ends)At\.toISOString\(\)\.slice\(0,\s*10\)/,
  );
});
