import assert from "node:assert/strict";
import test from "node:test";
import { cyclePrice, entitlement, plans, trialDaysRemaining, trialEndsAt } from "../src/domain/subscription/plans";
test("P59 commercial catalog has five plans and exact target monthly prices",()=>assert.deepEqual(plans.map(p=>p.monthlyToman),[531000,729000,1161000,1719000,2331000]));
test("P59 six-month and annual discounts are deterministic",()=>{assert.equal(cyclePrice(531000,"SEMIANNUAL"),2867400);assert.equal(cyclePrice(531000,"ANNUAL"),5097600)});
test("P59 trial is exactly fifteen days",()=>{const s=new Date("2026-09-04T00:00:00Z");assert.equal(trialEndsAt(s).toISOString(),"2026-09-19T00:00:00.000Z");assert.equal(trialDaysRemaining(trialEndsAt(s),s),15)});
test("P59 expired trial is read-only and active subscription can write",()=>{const past=new Date("2026-01-01");assert.equal(entitlement("TRIALING",past,new Date("2026-09-04")).canWrite,false);assert.equal(entitlement("ACTIVE",past).canWrite,true)});
