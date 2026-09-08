import assert from "node:assert/strict";
import test from "node:test";

import {
  createCsvExport,
  previewImport,
} from "../src/application/data-portability/data-portability";
import {
  buildBackupManifest,
  verifyBackupManifest,
} from "../src/application/data-portability/backup-manifest";
import {
  completeRequestContext,
  createRequestContext,
} from "../src/platform/observability/request-context";
import {
  createStructuredLog,
} from "../src/platform/observability/structured-log";

test("P61 W CSV export is deterministic and checksummed", () => {
  const exportFile = createCsvExport(
    "customers",
    ["name", "email"],
    [
      ["Ali", "ali@example.test"],
      ['"Quoted"', "q@example.test"],
    ],
  );

  assert.equal(exportFile.filename, "customers.csv");
  assert.equal(exportFile.mimeType, "text/csv");
  assert.equal(exportFile.sha256.length, 64);
  assert.match(exportFile.content, /""Quoted""/);
});

test("P61 W import preview is dry-run and reports row errors", () => {
  const preview = previewImport(
    [{ name: "A" }, { name: "" }],
    (row, rowNumber) =>
      row.name
        ? []
        : [{
            row: rowNumber,
            field: "name",
            code: "REQUIRED",
            message: "name is required",
          }],
  );

  assert.equal(preview.mode, "DRY_RUN");
  assert.equal(preview.totalRows, 2);
  assert.equal(preview.acceptedRows, 1);
  assert.equal(preview.rejectedRows, 1);
  assert.equal(preview.errors[0]?.row, 3);
});

test("P61 W backup evidence requires encryption metadata and checksum", () => {
  const payload = "encrypted-payload";

  const manifest = buildBackupManifest({
    workspaceId: "ws_1",
    createdAt: new Date("2026-09-08T00:00:00.000Z"),
    encryptedPayload: payload,
    encryptionAlgorithm: "AES-256-GCM",
    objectCount: 120,
    schemaVersion: "p61",
  });

  assert.equal(manifest.encrypted, true);
  assert.equal(manifest.checksum.length, 64);
  assert.equal(verifyBackupManifest(manifest, payload), true);
  assert.equal(verifyBackupManifest(manifest, "tampered"), false);
});

test("P61 X request context always exposes request id and duration", () => {
  const context = createRequestContext("req-fixed");
  const completed = completeRequestContext(context);

  assert.equal(completed.requestId, "req-fixed");
  assert.ok(completed.durationMs >= 0);
});

test("P61 X structured logs redact credential material", () => {
  const log = createStructuredLog({
    level: "info",
    event: "api.request",
    requestId: "req-1",
    metadata: {
      password: "never-log-this",
      nested: {
        token: "also-secret",
        safe: "visible",
      },
    },
  });

  assert.equal(log.metadata?.password, "[REDACTED]");
  assert.deepEqual(log.metadata?.nested, {
    token: "[REDACTED]",
    safe: "visible",
  });
});
