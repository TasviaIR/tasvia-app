import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { trialEndsAt } from "../src/domain/subscription/plans";
import { evaluateWorkspaceEntitlement } from "../src/application/subscription/workspace-entitlement";

test("P60 automatic trial is exactly fifteen days", () => {
  const startedAt = new Date("2026-09-04T12:00:00.000Z");
  const endsAt = trialEndsAt(startedAt);
  assert.equal(endsAt.getTime() - startedAt.getTime(), 15 * 24 * 60 * 60 * 1000);
});

test("P60 central entitlement permits active and unexpired trial writes", () => {
  const now = new Date("2026-09-04T12:00:00.000Z");
  const active = evaluateWorkspaceEntitlement(
    { status: "ACTIVE", trialEndsAt: new Date("2026-01-01T00:00:00.000Z") },
    now,
  );
  const trial = evaluateWorkspaceEntitlement(
    { status: "TRIALING", trialEndsAt: new Date("2026-09-05T12:00:00.000Z") },
    now,
  );

  assert.equal(active.canWrite, true);
  assert.equal(trial.canWrite, true);
});

test("P60 central entitlement fails closed for missing or expired subscription", () => {
  const now = new Date("2026-09-04T12:00:00.000Z");
  const missing = evaluateWorkspaceEntitlement(null, now);
  const expired = evaluateWorkspaceEntitlement(
    { status: "TRIALING", trialEndsAt: new Date("2026-09-04T11:59:59.999Z") },
    now,
  );
  const canceled = evaluateWorkspaceEntitlement(
    { status: "CANCELED", trialEndsAt: new Date("2026-09-20T00:00:00.000Z") },
    now,
  );

  assert.deepEqual(missing, {
    canRead: true,
    canWrite: false,
    reason: "SUBSCRIPTION_REQUIRED",
  });
  assert.equal(expired.canRead, true);
  assert.equal(expired.canWrite, false);
  assert.equal(canceled.canWrite, false);
});

test("P60 onboarding creates workspace owner and trial in one transaction", () => {
  const source = readFileSync("app/onboarding/actions.ts", "utf8");
  assert.match(source, /prisma\.\$transaction/);
  assert.match(source, /memberships:\s*\{\s*create:/);
  assert.match(source, /role:\s*"OWNER"/);
  assert.match(source, /provisionWorkspaceTrial\(tx, workspace\.id, startedAt\)/);
});

test("P60 core financial writes call centralized workspace entitlement gate", () => {
  const files = [
    "src/application/accounting/simple-workflow-persistence.ts",
    "src/application/settlements/settlement-service.ts",
    "src/application/cheques/cheque-service.ts",
    "src/application/accounting/fiscal-close-service.ts",
  ];

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /assertWorkspaceWriteEntitlement\(input\.workspaceId\)/, file);
  }
});
