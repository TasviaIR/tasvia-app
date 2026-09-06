import assert from "node:assert/strict";
import test from "node:test";
import { API_SCOPES, hashApiSecret, hasScope } from "../src/application/api-platform/api-contract";
test("P59 API V1 exposes explicit read scopes",()=>{assert.equal(API_SCOPES.length,7);assert.ok(API_SCOPES.includes("customers:read"));assert.ok(API_SCOPES.includes("reports:read"))});
test("P59 API secrets are stored as deterministic hashes",()=>{const h=hashApiSecret("tv_live_example");assert.equal(h.length,64);assert.equal(h,hashApiSecret("tv_live_example"));assert.notEqual(h,"tv_live_example")});
test("P59 API scope checks fail closed",()=>{assert.equal(hasScope(["customers:read"],"customers:read"),true);assert.equal(hasScope(["customers:read"],"reports:read"),false)});
