"use client";

import { JalaliDateInput } from "../../../src/components/date/jalali-date-input";

import { useActionState, useState } from "react";
import {
  submitSettlementAction,
  type TreasurySettlementState,
} from "./actions";

type BalanceOption = {
  id: string;
  counterpartyName: string;
  outstandingAmount: string;
  dueAt: string;
  sourceDocumentId: string;
};

const initialState: TreasurySettlementState = {
  ok: false,
  message: "",
};

export function TreasurySettlementForm({
  receivables,
  payables,
  treasuryAccounts,
}: {
  receivables: BalanceOption[];
  payables: BalanceOption[];
  treasuryAccounts: Array<{
    id: string;
    code: string;
    name: string;
  }>;
}) {
  const [direction, setDirection] =
    useState<"RECEIPT" | "PAYMENT">("RECEIPT");

  const [state, action, pending] = useActionState(
    submitSettlementAction,
    initialState,
  );

  const balances =
    direction === "RECEIPT" ? receivables : payables;

  return (
    <form
      action={action}
      className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 md:grid-cols-2 xl:grid-cols-5"
    >
      <label className="text-xs font-black text-slate-600">
        نوع عملیات
        <select
          name="direction"
          value={direction}
          onChange={(event) =>
            setDirection(event.target.value as "RECEIPT" | "PAYMENT")
          }
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"
        >
          <option value="RECEIPT">دریافت از مشتری</option>
          <option value="PAYMENT">پرداخت به تأمین‌کننده</option>
        </select>
      </label>

      <label className="text-xs font-black text-slate-600 xl:col-span-2">
        مانده باز
        <select
          name="openBalanceId"
          required
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"
        >
          <option value="">انتخاب کنید</option>
          {balances.map((balance) => (
            <option key={balance.id} value={balance.id}>
              {balance.counterpartyName} ·{" "}
              {new Intl.NumberFormat("fa-IR").format(
                BigInt(balance.outstandingAmount),
              )}{" "}
              ریال
            </option>
          ))}
        </select>
      </label>

      <label className="text-xs font-black text-slate-600">
        صندوق / بانک
        <select
          name="treasuryAccountCode"
          required
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"
        >
          {treasuryAccounts.map((account) => (
            <option key={account.id} value={account.code}>
              {account.name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-xs font-black text-slate-600">
        مبلغ (ریال)
        <input
          name="amount"
          required
          inputMode="numeric"
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"
        />
      </label>

      <label className="text-xs font-black text-slate-600">
        تاریخ
        <JalaliDateInput name="occurredAt" required className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" />
      </label>

      <label className="text-xs font-black text-slate-600 md:col-span-2 xl:col-span-3">
        شرح
        <input
          name="description"
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"
        />
      </label>

      <div className="md:col-span-2 xl:col-span-5">
        {state.message ? (
          <div
            className={`mb-3 rounded-xl px-4 py-3 text-xs font-black ${
              state.ok
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            }`}
          >
            {state.message}
          </div>
        ) : null}

        <button
          disabled={
            pending ||
            balances.length === 0 ||
            treasuryAccounts.length === 0
          }
          className="w-full rounded-xl bg-[#102845] px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          {pending
            ? "در حال ثبت…"
            : direction === "RECEIPT"
              ? "ثبت دریافت"
              : "ثبت پرداخت"}
        </button>
      </div>
    </form>
  );
}
