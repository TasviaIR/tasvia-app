import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  API_SCOPES,
  hashApiSecret,
  issueApiSecret,
  validateApiScopes,
} from "../src/application/api-platform/api-contract";

test("P60 API secret issue stores hash material separately from raw token", () => {
  const issued = issueApiSecret();
  assert.match(issued.token, /^tv_live_/);
  assert.equal(issued.hash, hashApiSecret(issued.token));
  assert.notEqual(issued.hash, issued.token);
  assert.equal(issued.hash.length, 64);
});

test("P60 API scopes are explicit, deduplicated and fail closed", () => {
  assert.deepEqual(
    validateApiScopes(["customers:read", "customers:read", "reports:read"]),
    ["customers:read", "reports:read"],
  );
  assert.throws(() => validateApiScopes([]), /API_SCOPE_REQUIRED/);
  assert.throws(
    () => validateApiScopes(["customers:write"]),
    /API_SCOPE_INVALID/,
  );
  assert.equal(API_SCOPES.includes("customers:read"), true);
});

test("P60 API key actions return raw secret only to authenticated action state", () => {
  const actions = readFileSync("app/app/api-keys/actions.ts", "utf8");
  assert.match(actions, /return \{ secret: issued\.token, error: null \}/);
  assert.match(actions, /secretHash: issued\.hash/);
  assert.doesNotMatch(actions, /redirect\([^)]*issued\.token/);
});

test("P60 API key rotation is workspace scoped and invalidates prior hash", () => {
  const actions = readFileSync("app/app/api-keys/actions.ts", "utf8");
  assert.match(actions, /workspaceId: current\.workspace\.id/);
  assert.match(actions, /revokedAt: null/);
  assert.match(actions, /secretHash: issued\.hash/);
  assert.match(actions, /lastUsedAt: null/);
});

test("P60 API UI exposes one-time secret reveal without server rendered secret", () => {
  const client = readFileSync("app/app/api-keys/api-key-secret-forms.tsx", "utf8");
  const page = readFileSync("app/app/api-keys/page.tsx", "utf8");
  assert.match(client, /data-testid="api-secret-one-time-reveal"/);
  assert.match(client, /navigator\.clipboard\.writeText\(secret\)/);
  assert.doesNotMatch(page, /issued\.token|secretHash/);
});
