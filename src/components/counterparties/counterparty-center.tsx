import Link from "next/link";
import { createCounterpartyAction } from "../../../app/app/counterparties/actions";

type Row = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  active: boolean;
  outstanding: bigint;
  overdue: bigint;
  nextDue: Date | null;
  dueSoon: number;
  dueCheques: number;
  lastDocument: {
    invoiceNumber: string;
    issuedAt: Date;
    total: bigint;
    status: string;
  } | null;
};

const money = (v: bigint) => `${new Intl.NumberFormat("fa-IR").format(v)} ریال`;
const date = (v: Date | null) =>
  v ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(v) : "—";

export function CounterpartyCenter({
  kind, rows, metrics,
}: {
  kind: "CUSTOMER" | "SUPPLIER";
  rows: Row[];
  metrics: { active: number; outstanding: bigint; overdue: bigint; dueSoon: number };
}) {
  const customer = kind === "CUSTOMER";
  const noun = customer ? "مشتری" : "تأمین‌کننده";
  const openLabel = customer ? "مطالبات باز" : "بدهی باز";
  const overdueLabel = customer ? "مطالبات سررسیدشده" : "بدهی سررسیدشده";
  const docLabel = customer ? "آخرین فروش" : "آخرین خرید";

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [openLabel, money(metrics.outstanding)],
          [overdueLabel, money(metrics.overdue)],
          ["سررسید هفت روز آینده", `${new Intl.NumberFormat("fa-IR").format(metrics.dueSoon)} مورد`],
          [`${noun}‌های فعال`, new Intl.NumberFormat("fa-IR").format(metrics.active)],
        ].map(([a,b]) => (
          <article key={a} className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_10px_30px_rgba(15,34,61,.045)]">
            <div className="text-xs font-bold text-slate-500">{a}</div>
            <div className="mt-3 text-xl font-black text-[#0f223d]">{b}</div>
          </article>
        ))}
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[.72fr_1.28fr]">
        <form action={createCounterpartyAction} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,34,61,.045)]">
          <input type="hidden" name="type" value={kind} />
          <div className="text-xs font-black text-[#008f87]">{noun} جدید</div>
          <h2 className="mt-1 text-xl font-black text-[#0f223d]">ساخت پرونده {noun}</h2>
          <div className="mt-5 grid gap-3">
            <input name="name" required placeholder={`نام ${noun} / شرکت`} className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#22b8ad]" />
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="phone" placeholder="شماره تماس" className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#22b8ad]" />
              <input name="email" type="email" placeholder="ایمیل" className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#22b8ad]" />
              <input name="nationalId" placeholder="شناسه ملی" className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#22b8ad]" />
              <input name="economicCode" placeholder="کد اقتصادی" className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#22b8ad]" />
            </div>
          </div>
          <button className="mt-4 w-full rounded-xl bg-[#008f87] px-4 py-3 text-sm font-black text-white">ثبت {noun}</button>
          <p className="mt-3 text-[10px] leading-5 text-slate-400">
            ساخت پرونده طرف حساب هیچ ثبت مالی یا انتقال وجه خودکاری ایجاد نمی‌کند.
          </p>
        </form>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,34,61,.045)]">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <div className="text-xs font-black text-[#008f87]">پرونده مالی</div>
              <h2 className="mt-1 text-xl font-black text-[#0f223d]">
                {customer ? "مشتری، فروش و مطالبات" : "تأمین‌کننده، خرید و بدهی"}
              </h2>
            </div>
            <Link href="/app/settlements" className="text-xs font-black text-[#008f87]">مرکز تسویه</Link>
          </div>

          {rows.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-sm font-black text-slate-700">هنوز {noun}‌ای ثبت نشده است.</div>
              <p className="mt-2 text-xs text-slate-400">اولین پرونده را از فرم کنار صفحه ایجاد کنید.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-right text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>{[noun,openLabel,overdueLabel,"نزدیک‌ترین سررسید",docLabel,"چک باز","وضعیت"].map(h=><th key={h} className="px-4 py-3 font-black">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="px-4 py-4"><div className="font-black">{r.name}</div><div className="mt-1 text-[10px] text-slate-400">{r.phone ?? r.email ?? "بدون اطلاعات تماس"}</div></td>
                      <td className="px-4 py-4 font-black">{money(r.outstanding)}</td>
                      <td className={`px-4 py-4 font-black ${r.overdue>0n?"text-rose-600":"text-slate-500"}`}>{money(r.overdue)}</td>
                      <td className="px-4 py-4">{date(r.nextDue)}</td>
                      <td className="px-4 py-4">{r.lastDocument ? <><div className="font-black">{r.lastDocument.invoiceNumber}</div><div className="mt-1 text-[10px] text-slate-400">{date(r.lastDocument.issuedAt)}</div></> : "—"}</td>
                      <td className="px-4 py-4">{new Intl.NumberFormat("fa-IR").format(r.dueCheques)}</td>
                      <td className="px-4 py-4"><span className={`rounded-lg px-2.5 py-1.5 font-black ${r.active?"bg-emerald-50 text-emerald-700":"bg-slate-100 text-slate-500"}`}>{r.active?"فعال":"غیرفعال"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </>
  );
}
