"use client";

import { JalaliDateInput } from "../../../src/components/date/jalali-date-input";
import { useActionState } from "react";
import { createPurchaseAction, type PurchaseActionState } from "./actions";

type Option = { id: string; name: string };
type ItemOption = { id: string; name: string; sku: string | null; unit: string; type: string };

const initialState: PurchaseActionState = { ok: false, message: "" };

export function PurchaseForm({
  suppliers,
  warehouses,
  items,
}: {
  suppliers: Option[];
  warehouses: Array<Option & { code: string }>;
  items: ItemOption[];
}) {
  const [state, formAction, pending] = useActionState(createPurchaseAction, initialState);

  return (
    <form action={formAction} className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_25px_rgba(15,34,61,.04)] sm:grid-cols-2 xl:grid-cols-4">
      <label className="text-xs font-black text-slate-600">شماره فاکتور<input name="invoiceNumber" required className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
      <label className="text-xs font-black text-slate-600">تأمین‌کننده<select name="supplierId" required className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="">انتخاب کنید</option>{suppliers.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
      <label className="text-xs font-black text-slate-600">انبار<select name="warehouseId" required className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="">انتخاب کنید</option>{warehouses.map((option) => <option key={option.id} value={option.id}>{option.name} · {option.code}</option>)}</select></label>
      <label className="text-xs font-black text-slate-600">کالا / خدمت<select name="itemId" required className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="">انتخاب کنید</option>{items.map((option) => <option key={option.id} value={option.id}>{option.name}{option.sku ? ` · ${option.sku}` : ""}</option>)}</select></label>
      <label className="text-xs font-black text-slate-600">تاریخ فاکتور<JalaliDateInput name="issuedAt" required className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
      <label className="text-xs font-black text-slate-600">سررسید<JalaliDateInput name="dueAt" required className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
      <label className="text-xs font-black text-slate-600">تعداد<input name="quantity" inputMode="numeric" required className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
      <label className="text-xs font-black text-slate-600">قیمت واحد (ریال)<input name="unitPrice" inputMode="numeric" required className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
      <label className="text-xs font-black text-slate-600">تخفیف (ریال)<input name="discount" inputMode="numeric" defaultValue="0" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
      <label className="text-xs font-black text-slate-600">مالیات (ریال)<input name="tax" inputMode="numeric" defaultValue="0" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
      <div className="sm:col-span-2 xl:col-span-4">
        {state.message ? <div className={`mb-3 rounded-xl px-4 py-3 text-xs font-black ${state.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{state.message}</div> : null}
        <button disabled={pending || suppliers.length === 0 || warehouses.length === 0 || items.length === 0} className="w-full rounded-xl bg-[#102845] px-4 py-3.5 text-sm font-black text-white transition hover:bg-[#17395f] disabled:cursor-not-allowed disabled:opacity-45">{pending ? "در حال ثبت…" : "ثبت پیش‌نویس خرید"}</button>
      </div>
    </form>
  );
}
