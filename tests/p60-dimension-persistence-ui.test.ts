import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("P60 dimension master persists workspace-scoped branch cost center and project values", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");

  assert.match(schema, /enum AccountingDimensionType\s*\{\s*BRANCH\s*COST_CENTER\s*PROJECT\s*\}/);
  assert.match(schema, /model AccountingDimensionValue/);
  assert.match(schema, /@@unique\(\[workspaceId, type, code\]\)/);
  assert.match(schema, /workspace\s+Workspace\s+@relation/);
});

test("P60 dimension application service is workspace scoped and entitlement guarded", () => {
  const source = readFileSync(
    "src/application/accounting/dimension-service.ts",
    "utf8",
  );

  assert.match(source, /where:\s*\{\s*workspaceId\s*\}/);
  assert.match(source, /workspaceId:\s*input\.workspaceId/);
  assert.match(source, /assertWorkspaceWriteEntitlement\(input\.workspaceId\)/);
  assert.match(source, /updateMany/);
});

test("P60 dimension management UI exposes all three accounting dimensions", () => {
  const page = readFileSync("app/app/dimensions/page.tsx", "utf8");

  assert.match(page, /type:\s*"BRANCH"/);
  assert.match(page, /type:\s*"COST_CENTER"/);
  assert.match(page, /type:\s*"PROJECT"/);
  assert.match(page, /شعب و ابعاد مالی/);
  assert.match(page, /dimension-empty-/);
});

test("P60 dimension server actions keep viewer read-only", () => {
  const actions = readFileSync("app/app/dimensions/actions.ts", "utf8");

  assert.match(actions, /if \(role === "VIEWER"\)/);
  assert.match(actions, /requireCurrentWorkspace\(\)/);
  assert.match(actions, /revalidatePath\("\/app\/dimensions"\)/);
});

test("P60 workspace navigation exposes dimensions route", () => {
  const nav = readFileSync("src/components/workspace/nav.tsx", "utf8");
  assert.match(nav, /\/app\/dimensions/);
  assert.match(nav, /شعب و ابعاد مالی/);
});
