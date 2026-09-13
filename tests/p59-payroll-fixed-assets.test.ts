import assert from "node:assert/strict";
import test from "node:test";
import { monthlyStraightLine, payrollNet } from "../src/application/workforce/workforce-center-service";
test("P59 payroll computes exact bigint net pay",()=>assert.equal(payrollNet(100_000_000n,12_500_000n),87_500_000n));
test("P59 payroll rejects deductions above gross",()=>assert.throws(()=>payrollNet(10n,11n),/PAYROLL_DEDUCTIONS_INVALID/));
test("P59 fixed asset depreciation is exact",()=>assert.equal(monthlyStraightLine(120_000_000n,0n,12),10_000_000n));
test("P59 fixed asset rejects bad residual",()=>assert.throws(()=>monthlyStraightLine(100n,101n,12),/ASSET_RESIDUAL_INVALID/));
