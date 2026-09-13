"use client";

import { JalaliDateInput } from "../../../src/components/date/jalali-date-input";
import { useActionState } from "react";
import { createSaleAction, type SalesActionState } from "./actions";

const initial: SalesActionState = { ok: false, message: "" };
const field =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-[#63dfd4] focus:ring-2 focus:ring-[#63dfd4]/20";

export function SalesForm({
  customers,
  warehouses,
  items,
}: {
  customers: { id: string; name: string }[];
  warehouses: { id: string; name: string; code: string }[];
  items: { id: string; name: string; sku: string | null }[];
}) {
  const [state, action, pending] = useActionState(createSaleAction, initial);
  const disabled = pending || !customers.length || !warehouses.length || !items.length;

  return (
    <form action={action} className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_25px_rgba(15,34,61,.04)] sm:grid-cols-2 xl:grid-cols-4">
      <label className="text-xs font-black text-slate-600">شماره فاکتور<input name="invoiceNumber" required autoComplete="off" className={field} /></label>
      <label className="text-xs font-black text-slate-600">مشتری<select name="customerId" required className={field}><option value="">انتخاب مشتری</option>{customers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label className="text-xs font-black text-slate-600">انبار<select name="warehouseId" required className={field}><option value="">انتخاب انبار</option>{warehouses.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.code}</option>)}</select></label>
      <label className="text-xs font-black text-slate-600">کالا / خدمت<select name="itemId" required className={field}><option value="">انتخاب قلم</option>{items.map((x) => <option key={x.id} value={x.id}>{x.name}{x.sku ? ` · ${x.sku}` : ""}</option>)}</select></label>
      <label className="text-xs font-black text-slate-600">تاریخ فاکتور<JalaliDateInput name="issuedAt" required className={field} /></label>
      <label className="text-xs font-black text-slate-600">سررسید<JalaliDateInput name="dueAt" required className={field} /></label>
      <label className="text-xs font-black text-slate-600">تعداد<input name="quantity" required inputMode="numeric" className={field} /></label>
      <label className="text-xs font-black text-slate-600">قیمت واحد (ریال)<input name="unitPrice" required inputMode="numeric" className={field} /></label>
      <label className="text-xs font-black text-slate-600">تخفیف (ریال)<input name="discount" defaultValue="0" inputMode="numeric" className={field} /></label>
      <label className="text-xs font-black text-slate-600">مالیات (ریال)<input name="tax" defaultValue="0" inputMode="numeric" className={field} /></label>

      <div className="sm:col-span-2 xl:col-span-4">
        {!customers.length || !warehouses.length || !items.length ? (
          <div className="mb-3 rounded-xl bg-amber-50 px-4 py-3 text-xs font-black leading-6 text-amber-700">
            برای ثبت فروش باید حداقل یک مشتری، یک انبار و یک کالا یا خدمت فعال داشته باشید.
          </div>
        ) : null}
        {state.message ? (
          <div className={`mb-3 rounded-xl px-4 py-3 text-xs font-black ${state.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            {state.message}
          </div>
        ) : null}
        <button disabled={disabled} className="w-full rounded-xl bg-[#102845] px-4 py-3.5 text-sm font-black text-white transition hover:bg-[#17395f] disabled:cursor-not-allowed disabled:opacity-45">
          {pending ? "در حال ثبت…" : "ثبت پیش‌نویس فروش"}
        </button>
      </div>
    </form>
  );
}
