"use client";

import { useActionState, useState } from "react";
import { createChequeAction, type ChequeActionState } from "./actions";
import { JalaliDateInput } from "../../../src/components/date/jalali-date-input";

const initial: ChequeActionState = { ok: false, message: "" };

export function ChequeForm({
  counterparties,
  balances,
}: {
  counterparties: { id: string; name: string; type: string }[];
  balances: {
    id: string;
    counterpartyId: string;
    type: string;
    outstandingAmount: string;
    counterparty: { name: string };
  }[];
}) {
  const [direction, setDirection] = useState<"RECEIVED" | "ISSUED">("RECEIVED");
  const [state, action, pending] = useActionState(createChequeAction, initial);

  const validBalances = balances.filter((balance) =>
    direction === "RECEIVED"
      ? balance.type === "RECEIVABLE"
      : balance.type === "PAYABLE",
  );

  const cls =
    "mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm";

  return (
    <form action={action} className="grid gap-4 rounded-3xl border bg-white p-5 sm:grid-cols-2 xl:grid-cols-4">
      <label className="text-xs font-black">
        نوع چک
        <select
          name="direction"
          value={direction}
          onChange={(e) => setDirection(e.target.value as "RECEIVED" | "ISSUED")}
          className={cls}
        >
          <option value="RECEIVED">دریافتی</option>
          <option value="ISSUED">پرداختی</option>
        </select>
      </label>

      <label className="text-xs font-black">
        طرف حساب
        <select name="counterpartyId" required className={cls}>
          <option value="">انتخاب</option>
          {counterparties.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
      </label>

      <label className="text-xs font-black">
        شماره چک
        <input name="chequeNumber" required className={cls} />
      </label>

      <label className="text-xs font-black">
        شناسه صیاد
        <input name="sayadId" className={cls} />
      </label>

      <label className="text-xs font-black">
        بانک
        <input name="bankName" className={cls} />
      </label>

      <label className="text-xs font-black">
        مبلغ
        <input name="amount" required inputMode="numeric" className={cls} />
      </label>

      <label className="text-xs font-black">
        تاریخ صدور
        <JalaliDateInput name="issuedAt" required className={cls} />
      </label>

      <label className="text-xs font-black">
        سررسید
        <JalaliDateInput name="dueAt" required className={cls} />
      </label>

      <label className="text-xs font-black sm:col-span-2 xl:col-span-4">
        اتصال اختیاری به مانده باز
        <select name="openBalanceId" className={cls}>
          <option value="">بدون اتصال</option>
          {validBalances.map((x) => (
            <option key={x.id} value={x.id}>
              {x.counterparty.name} · {new Intl.NumberFormat("fa-IR").format(BigInt(x.outstandingAmount))} ریال
            </option>
          ))}
        </select>
      </label>

      <div className="sm:col-span-2 xl:col-span-4">
        {state.message ? <div className="mb-3 rounded-xl bg-slate-50 p-3 text-xs font-black">{state.message}</div> : null}
        <button disabled={pending} className="w-full rounded-xl bg-[#102845] p-3 text-sm font-black text-white">
          {pending ? "در حال ثبت…" : "ثبت چک"}
        </button>
      </div>
    </form>
  );
}
