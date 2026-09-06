import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  API_RATE_LIMIT_PER_MINUTE,
} from "../src/application/api-platform/api-request-guard";

test("P60 API rate limit uses a persistent Prisma bucket", () => {
  const source = readFileSync(
    "src/application/api-platform/api-request-guard.ts",
    "utf8",
  );

  assert.equal(API_RATE_LIMIT_PER_MINUTE, 120);
  assert.match(source, /prisma\.apiRateLimitBucket\.upsert/);
  assert.match(source, /requestCount:\s*\{\s*increment:\s*1\s*\}/);
  assert.match(source, /apiKeyId.*windowNumber/);
});

test("P60 authorized API requests write auditable request evidence", () => {
  const source = readFileSync(
    "src/application/api-platform/api-request-guard.ts",
    "utf8",
  );

  assert.match(source, /prisma\.apiAuditLog\.create/);
  assert.match(source, /method:\s*input\.request\.method/);
  assert.match(source, /statusCode:\s*input\.statusCode/);
  assert.match(source, /requestId:\s*input\.requestId/);
});

test("P60 API responses expose request and rate-limit headers", () => {
  const source = readFileSync(
    "src/application/api-platform/api-request-guard.ts",
    "utf8",
  );

  assert.match(source, /x-request-id/);
  assert.match(source, /x-ratelimit-limit/);
  assert.match(source, /x-ratelimit-remaining/);
  assert.match(source, /retry-after/);
});

test("P60 all API V1 read routes use the centralized request guard", () => {
  const routes = [
    "app/api/v1/customers/route.ts",
    "app/api/v1/suppliers/route.ts",
    "app/api/v1/sales/route.ts",
    "app/api/v1/purchases/route.ts",
    "app/api/v1/inventory/route.ts",
    "app/api/v1/treasury/route.ts",
    "app/api/v1/reports/summary/route.ts",
  ];

  for (const route of routes) {
    const source = readFileSync(route, "utf8");
    assert.match(source, /withAuthorizedApi\(request,/);
    assert.doesNotMatch(source, /authorizeApi\(request,/);
  }
});

test("P60 API V1 remains read-only", () => {
  const routes = [
    "app/api/v1/customers/route.ts",
    "app/api/v1/suppliers/route.ts",
    "app/api/v1/sales/route.ts",
    "app/api/v1/purchases/route.ts",
    "app/api/v1/inventory/route.ts",
    "app/api/v1/treasury/route.ts",
    "app/api/v1/reports/summary/route.ts",
  ];

  for (const route of routes) {
    const source = readFileSync(route, "utf8");
    assert.doesNotMatch(source, /export async function (POST|PUT|PATCH|DELETE)/);
  }
});
