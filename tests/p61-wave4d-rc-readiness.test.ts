import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const auth = fs.readFileSync("src/lib/auth.ts", "utf8");
const envExample = fs.readFileSync(".env.example", "utf8");
const portabilityPage = fs.readFileSync(
  "app/app/data-portability/page.tsx",
  "utf8",
);
const restoreReadiness = fs.readFileSync(
  "src/production/workspace-restore-readiness.ts",
  "utf8",
);
const healthRoute = fs.readFileSync("app/api/health/route.ts", "utf8");

test("P61 X Better Auth has an explicit canonical base URL contract", () => {
  assert.match(auth, /BETTER_AUTH_URL/);
  assert.match(auth, /baseURL/);
  assert.match(envExample, /BETTER_AUTH_URL/);
});

test("P61 X production auth fallback uses canonical tasvin origin", () => {
  assert.match(auth, /https:\/\/tasvin\.ir/);
});

test("P61 W restore readiness is persisted and workspace scoped", () => {
  assert.match(
    restoreReadiness,
    /restoreRehearsalEvidence\.findFirst/,
  );
  assert.match(restoreReadiness, /workspaceId/);
  assert.match(restoreReadiness, /passed:\s*true/);
});

test("P61 W data portability displays fail-closed restore readiness", () => {
  assert.match(portabilityPage, /resolveWorkspaceRestoreReadiness/);
  assert.match(portabilityPage, /hasPassingRestoreRehearsal/);
  assert.match(portabilityPage, /آمادگی بازیابی هنوز تأیید نشده/);
});

test("P61 X health route remains dynamic and uncached", () => {
  assert.match(healthRoute, /force-dynamic/);
  assert.match(healthRoute, /no-store/);
});

test("P61 X data portability tables remain narrow-screen safe", () => {
  assert.match(portabilityPage, /overflow-x-auto/);
});

test("P61 X primary data import form has an explicit accessible label", () => {
  const form = fs.readFileSync(
    "app/app/data-portability/counterparty-import-form.tsx",
    "utf8",
  );

  assert.match(form, /<label/);
  assert.match(form, /type="file"/);
  assert.match(form, /disabled=\{previewPending\}/);
  assert.match(form, /disabled=\{commitPending\}/);
});
