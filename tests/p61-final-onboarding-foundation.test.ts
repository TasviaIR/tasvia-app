import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  normalizeIranianMobile,
  validateRegistrationProfile,
  verificationComplete,
} from "../src/application/onboarding/onboarding-contract";

test("P61 final onboarding normalizes Iranian mobile numbers", () => {
  assert.equal(normalizeIranianMobile("+989121234567"), "09121234567");
  assert.equal(normalizeIranianMobile("09121234567"), "09121234567");
  assert.throws(() => normalizeIranianMobile("123"));
});

test("P61 final onboarding requires explicit terms consent", () => {
  assert.throws(() =>
    validateRegistrationProfile({
      firstName: "امیر",
      lastName: "متفکر",
      phone: "09121234567",
      termsAccepted: false,
    }),
  );
});

test("P61 final onboarding requires both email and phone verification", () => {
  assert.equal(
    verificationComplete({ emailVerified: true, phoneVerified: false }),
    false,
  );
  assert.equal(
    verificationComplete({ emailVerified: true, phoneVerified: true }),
    true,
  );
});

test("P61 final onboarding schema persists phone verification and business draft", () => {
  const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
  assert.match(schema, /phoneVerified\s+Boolean/);
  assert.match(schema, /model OnboardingDraft/);
  assert.match(schema, /model OnboardingVerificationChallenge/);
  assert.match(schema, /model WorkspaceBusinessProfile/);
  assert.match(schema, /model WorkspaceAccountingSettings/);
});

test("P61 final registration collects the required trial identity fields", () => {
  const form = fs.readFileSync("app/register/registration-form.tsx", "utf8");
  for (const field of [
    "firstName",
    "lastName",
    "phone",
    "email",
    "password",
    "passwordConfirm",
    "termsAccepted",
  ]) {
    assert.match(form, new RegExp(field));
  }
});

test("P61 final verification flow covers both email and phone", () => {
  const panel = fs.readFileSync("app/verify/verification-panel.tsx", "utf8");
  assert.match(panel, /EMAIL/);
  assert.match(panel, /PHONE/);
  assert.match(panel, /تأیید ایمیل/);
  assert.match(panel, /تأیید موبایل/);
});
