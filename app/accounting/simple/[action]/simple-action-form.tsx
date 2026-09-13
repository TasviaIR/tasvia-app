"use client";

import { useActionState, useState } from "react";
import { submitSimpleAccountingAction, type SimpleActionState } from "./actions";
import { JalaliDateInput } from "../../../../src/components/date/jalali-date-input";
import { toJalaliInputValue } from "../../../../src/lib/tasvin-date";

export type SimpleActionOption = {
  id: string;
  label: string;
  meta?: string;
};

const initialState: SimpleActionState = { ok: false, message: "" };

export function SimpleActionForm({
  action,
  options,
}: {
  action: "sale" | "purchase" | "receipt" | "payment" | "expense";
  options: SimpleActionOption[];
}) {
  const [state, formAction, pending] = useActionState(submitSimpleAccountingAction, initialState);
  const [commandId, setCommandId] = useState(() => crypto.randomUUID());
  const today = toJalaliInputValue(new Date());
  const needsCounterparty = action === "sale" || action === "purchase";
  const needsBalance = action === "receipt" || action === "payment";

  return (
    <form
      action={async (formData) => {
        await formAction(formData);
        setCommandId(crypto.randomUUID());
      }}
      className="mt-8 space-y-5"
    >
      <input type="hidden" name="action" value={action} />
      <input type="hidden" name="commandId" value={commandId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-black text-[#26354a]">مبلغ (ریال)</span>
          <input name="amount" inputMode="numeric" required placeholder="مثلاً ۱۲۵۰۰۰۰۰" className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-[#0b8d85] focus:ring-4 focus:ring-[#0b8d85]/10" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-black text-[#26354a]">تاریخ ثبت</span>
          <JalaliDateInput name="occurredAt" required defaultValue={today} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-[#0b8d85] focus:ring-4 focus:ring-[#0b8d85]/10" />
        </label>
      </div>

      {needsCounterparty ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-black text-[#26354a]">{action === "sale" ? "مشتری" : "تأمین‌کننده"}</span>
            <select name="counterpartyId" required className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-[#0b8d85]">
              <option value="">انتخاب کنید</option>
              {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-black text-[#26354a]">سررسید</span>
            <JalaliDateInput name="dueAt" required defaultValue={today} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-[#0b8d85]" />
          </label>
        </div>
      ) : null}

      {needsBalance ? (
        <label className="block">
          <span className="mb-2 block text-sm font-black text-[#26354a]">{action === "receipt" ? "طلبی که تسویه می‌شود" : "بدهی که پرداخت می‌شود"}</span>
          <select name="openBalanceId" required className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-[#0b8d85]">
            <option value="">انتخاب مانده باز</option>
            {options.map((option) => <option key={option.id} value={option.id}>{option.label}{option.meta ? ` — ${option.meta}` : ""}</option>)}
          </select>
        </label>
      ) : null}

      <label className="block">
        <span className="mb-2 block text-sm font-black text-[#26354a]">شرح</span>
        <textarea name="description" rows={3} placeholder={action === "expense" ? "مثلاً اجاره، حمل‌ونقل یا هزینه جاری" : "شرح اختیاری عملیات"} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0b8d85] focus:ring-4 focus:ring-[#0b8d85]/10" />
      </label>

      {options.length === 0 && (needsCounterparty || needsBalance) ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
          {needsCounterparty ? "برای این عملیات هنوز طرف حساب مناسب در Workspace ثبت نشده است." : "برای این عملیات هنوز مانده باز قابل تسویه وجود ندارد."}
        </div>
      ) : null}

      {state.message ? (
        <div className={`rounded-2xl border p-4 text-sm font-bold leading-7 ${state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          {state.message}{state.journalId ? <div className="mt-1 text-xs font-normal">شناسه سند: {state.journalId}</div> : null}
        </div>
      ) : null}

      <button disabled={pending || (options.length === 0 && (needsCounterparty || needsBalance))} className="min-h-12 w-full rounded-2xl bg-[#102845] px-5 py-3 text-sm font-black text-white transition hover:bg-[#173657] disabled:cursor-not-allowed disabled:opacity-45">
        {pending ? "در حال ثبت امن و متوازن…" : "ثبت نهایی عملیات"}
      </button>

      <p className="text-center text-[11px] leading-5 text-[#778397]">ثبت در یک Transaction انجام می‌شود؛ در صورت خطا، سند یا مانده ناقص ایجاد نمی‌شود.</p>
    </form>
  );
}
