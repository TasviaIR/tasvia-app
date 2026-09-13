import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("P61 verification request delivers before persisting challenge", () => {
  const source = fs.readFileSync(
    "app/api/onboarding/verification/request/route.ts",
    "utf8",
  );

  const delivery = source.indexOf("await deliverVerificationCode");
  const persistence = source.indexOf(
    "prisma.onboardingVerificationChallenge.create",
  );

  assert.ok(delivery >= 0);
  assert.ok(persistence >= 0);
  assert.ok(delivery < persistence);
});

test("P61 production verification uses Resend and Kavenegar provider contract", () => {
  const source = fs.readFileSync(
    "src/application/onboarding/verification-delivery.ts",
    "utf8",
  );

  assert.match(source, /https:\/\/api\.resend\.com\/emails/);
  assert.match(source, /api\.kavenegar\.com/);
  assert.match(source, /RESEND_API_KEY/);
  assert.match(source, /RESEND_FROM_EMAIL/);
  assert.match(source, /KAVENEGAR_API_KEY/);
  assert.match(source, /KAVENEGAR_VERIFY_TEMPLATE/);
  assert.match(source, /mode === "providers"/);
});

test("P61 production verification remains fail closed", () => {
  const source = fs.readFileSync(
    "src/application/onboarding/verification-delivery.ts",
    "utf8",
  );

  assert.match(source, /NODE_ENV === "production"/);
  assert.match(source, /PRODUCTION_PROVIDER_NOT_CONFIGURED/);
  assert.match(source, /RESEND_NOT_CONFIGURED/);
  assert.match(source, /KAVENEGAR_NOT_CONFIGURED/);
});

test("P61 production response never exposes debug OTP", () => {
  const source = fs.readFileSync(
    "app/api/onboarding/verification/request/route.ts",
    "utf8",
  );

  assert.match(
    source,
    /process\.env\.NODE_ENV === "production"[\s\S]*undefined/,
  );
});

test("P61 verification provider secrets remain environment only", () => {
  const env = fs.readFileSync(".env.example", "utf8");

  assert.match(env, /^RESEND_API_KEY=/m);
  assert.match(env, /^RESEND_FROM_EMAIL=/m);
  assert.match(env, /^KAVENEGAR_API_KEY=/m);
  assert.match(env, /^KAVENEGAR_VERIFY_TEMPLATE=/m);

  assert.doesNotMatch(env, /^VERIFICATION_EMAIL_TOKEN=/m);
  assert.doesNotMatch(env, /^VERIFICATION_SMS_TOKEN=/m);
});

test("P61 Kavenegar adapter uses VerifyLookup OTP contract", () => {
  const source = fs.readFileSync(
    "src/application/onboarding/verification-delivery.ts",
    "utf8",
  );

  assert.match(source, /verify\/lookup\.json/);
  assert.match(source, /receptor: input\.destination/);
  assert.match(source, /token: input\.code/);
  assert.match(source, /template/);
  assert.match(source, /type: "sms"/);
});

test("P61 Resend adapter sends transactional verification email", () => {
  const source = fs.readFileSync(
    "src/application/onboarding/verification-delivery.ts",
    "utf8",
  );

  assert.match(source, /authorization: `Bearer \$\{apiKey\}`/);
  assert.match(source, /account_verification/);
  assert.match(source, /کد تأیید تسوین/);
});
