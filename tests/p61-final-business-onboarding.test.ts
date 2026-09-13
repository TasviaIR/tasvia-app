import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
const onboarding = fs.readFileSync("app/onboarding/page.tsx", "utf8");
const actions = fs.readFileSync("app/onboarding/actions.ts", "utf8");
const layout = fs.readFileSync("app/app/layout.tsx", "utf8");

test("P61 final wizard exposes three setup stages", () => {
  assert.match(onboarding, /کسب‌وکار جدید/);
  assert.match(onboarding, /اطلاعات کسب‌وکار/);
  assert.match(onboarding, /تنظیمات اولیه حسابداری/);
});
test("P61 final wizard supports Persian English and guidance surface", () => {
  assert.match(onboarding, /value="FA"/); assert.match(onboarding, /value="EN"/);
  assert.match(onboarding, /چگونه یک کسب‌وکار جدید در تسوین معرفی کنیم/);
  assert.match(onboarding, /ویدئوی راه‌اندازی تسوین/);
});
test("P61 final profile captures required business identity data", () => {
  for (const field of ["legalName","businessType","activityField","nationalId","economicCode","registrationNumber","country","province","city","postalCode","businessPhone","fax","address","website","businessEmail"]) assert.match(onboarding,new RegExp(field));
});
test("P61 final accounting setup exposes required controls", () => {
  for (const field of ["inventoryAccountingSystem","inventoryValuationMethod","manufacturingEnabled","inventoryEnabled","multiCurrencyEnabled","baseCurrency","vatRate","calendar","fiscalYearStartsAt","fiscalYearEndsAt","fiscalYearTitle"]) assert.match(onboarding,new RegExp(field));
  assert.match(onboarding,/FIFO/); assert.match(onboarding,/IRR/);
});
test("P61 completion provisions everything atomically", () => {
  assert.match(actions,/prisma\.\$transaction/); assert.match(actions,/memberships:/); assert.match(actions,/businessProfile:/); assert.match(actions,/accountingSettings:/); assert.match(actions,/fiscalPeriods:/); assert.match(actions,/provisionWorkspaceTrial/); assert.match(actions,/WORKSPACE_ONBOARDING_COMPLETED/); assert.match(actions,/redirect\("\/app"\)/);
});
test("P61 final setup requires verified email and phone", () => {
  assert.match(actions,/emailVerified/); assert.match(actions,/phoneVerified/); assert.match(actions,/redirect\("\/verify"\)/);
});
test("P61 app empty state exposes create-new-business journey", () => {
  assert.match(layout,/راه‌اندازی کسب‌وکار جدید/); assert.match(layout,/href="\/onboarding"/); assert.doesNotMatch(layout,/درخواست دسترسی پایلوت/);
});
