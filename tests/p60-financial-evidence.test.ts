import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validateEvidenceMetadata } from "../src/application/evidence/financial-evidence-service";

test("P60 A8 evidence model is workspace scoped and archive based", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const model = /model FinancialEvidence \{([\s\S]*?)^\}/m.exec(schema)?.[1] ?? "";

  assert.match(model, /workspaceId\s+String/);
  assert.match(model, /sha256\s+String/);
  assert.match(model, /storageKey\s+String/);
  assert.match(model, /archivedAt\s+DateTime\?/);
  assert.doesNotMatch(model, /updatedAt/);
});

test("P60 A8 evidence metadata rejects unsafe MIME size hash and storage path", () => {
  const base = {
    category: "INVOICE",
    sourceEntityType: "SalesInvoice",
    sourceEntityId: "invoice-1",
    safeFileName: "invoice-1405.pdf",
    mimeType: "application/pdf",
    byteSize: 1024,
    sha256: "a".repeat(64),
    storageKey: "workspace/evidence/invoice-1405.pdf",
  };

  assert.equal(validateEvidenceMetadata(base).sha256, "a".repeat(64));

  assert.throws(
    () => validateEvidenceMetadata({ ...base, mimeType: "application/x-msdownload" }),
    /EVIDENCE_MIME_NOT_ALLOWED/,
  );
  assert.throws(
    () => validateEvidenceMetadata({ ...base, byteSize: 100_000_000 }),
    /EVIDENCE_SIZE_INVALID/,
  );
  assert.throws(
    () => validateEvidenceMetadata({ ...base, sha256: "bad" }),
    /EVIDENCE_SHA256_INVALID/,
  );
  assert.throws(
    () => validateEvidenceMetadata({ ...base, storageKey: "../secret" }),
    /EVIDENCE_STORAGE_KEY_INVALID/,
  );
});

test("P60 A8 evidence registration and archive are auditable transactions", () => {
  const source = readFileSync(
    "src/application/evidence/financial-evidence-service.ts",
    "utf8",
  );

  assert.match(source, /prisma\.\$transaction/);
  assert.match(source, /recordAuditEventInTransaction/);
  assert.match(source, /FINANCIAL_EVIDENCE_REGISTERED/);
  assert.match(source, /FINANCIAL_EVIDENCE_ARCHIVED/);
});

test("P60 A8 evidence never deletes evidence rows through application service", () => {
  const source = readFileSync(
    "src/application/evidence/financial-evidence-service.ts",
    "utf8",
  );

  assert.doesNotMatch(
    source,
    /financialEvidence\.(delete|deleteMany)/,
  );
  assert.match(source, /archivedAt/);
});

test("P60 A8 evidence UI is authenticated and viewer remains read only", () => {
  const page = readFileSync("app/app/evidence/page.tsx", "utf8");
  const actions = readFileSync("app/app/evidence/actions.ts", "utf8");

  assert.match(page, /requireCurrentWorkspace\(\)/);
  assert.match(page, /evidence-empty-state/);
  assert.match(actions, /role === "VIEWER"/);
  assert.match(actions, /EVIDENCE_WRITE_FORBIDDEN/);
});

test("P60 A8 evidence does not activate production storage credentials", () => {
  const source = readFileSync(
    "src/application/evidence/financial-evidence-service.ts",
    "utf8",
  );

  assert.doesNotMatch(source, /S3_|R2_|BLOB_|AWS_|CLOUDFLARE_/);
});
