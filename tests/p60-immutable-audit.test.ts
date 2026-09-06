import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { redactAuditPayload } from "../src/application/audit/audit-service";

test("P60 A8 audit model is workspace scoped and has no updatedAt field", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const model = /model AuditEvent \{([\s\S]*?)^\}/m.exec(schema)?.[1] ?? "";
  assert.match(model, /workspaceId\s+String/);
  assert.match(model, /workspace\s+Workspace\s+@relation/);
  assert.match(model, /createdAt\s+DateTime/);
  assert.doesNotMatch(model, /updatedAt/);
});

test("P60 A8 database migration prevents ordinary audit update and delete", () => {
  const migration = readFileSync("prisma/migrations/20260905120500_p60_a8_immutable_audit/migration.sql", "utf8");
  assert.match(migration, /AuditEvent_prevent_update/);
  assert.match(migration, /AuditEvent_prevent_delete/);
  assert.match(migration, /AuditEvent is immutable/);
});

test("P60 A8 redaction removes credential material recursively", () => {
  const redacted = redactAuditPayload({
    password: "never",
    nested: { accessToken: "never", safe: "visible" },
    apiKey: "never",
  });

  assert.deepEqual(redacted, {
    password: "[REDACTED]",
    nested: { accessToken: "[REDACTED]", safe: "visible" },
    apiKey: "[REDACTED]",
  });
});

test("P60 A8 audit service exposes create/list only and no mutation API", () => {
  const source = readFileSync("src/application/audit/audit-service.ts", "utf8");
  assert.match(source, /prisma\.auditEvent\.create/);
  assert.match(source, /prisma\.auditEvent\.findMany/);
  assert.doesNotMatch(source, /prisma\.auditEvent\.(update|updateMany|delete|deleteMany)/);
});

test("P60 A8 authenticated audit UI and export are workspace scoped", () => {
  const page = readFileSync("app/app/audit/page.tsx", "utf8");
  const route = readFileSync("app/app/audit/export/route.ts", "utf8");
  assert.match(page, /requireCurrentWorkspace\(\)/);
  assert.match(page, /audit-empty-state/);
  assert.match(route, /auth\.api\.getSession/);
  assert.match(route, /membership\.findFirst/);
  assert.match(route, /private, no-store/);
});

test("P60 A8 workspace navigation exposes audit trail", () => {
  const nav = readFileSync("src/components/workspace/nav.tsx", "utf8");
  assert.match(nav, /\/app\/audit/);
  assert.match(nav, /ردپای حسابرسی/);
});
