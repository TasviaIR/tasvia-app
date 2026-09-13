"use client";

import Link from "next/link";
import { useState } from "react";

const nav = [
  ["dashboard", "داشبورد", "▦"],
  ["sales", "فروش", "◫"],
  ["purchases", "خرید", "▣"],
  ["treasury", "خزانه", "◉"],
  ["cheques", "چک‌ها", "▤"],
  ["accounting", "حسابداری", "≡"],
  ["reports", "گزارش‌ها", "▥"],
  ["payroll", "حقوق", "₮"],
  ["assets", "دارایی ثابت", "◆"],
  ["audit", "حسابرسی", "◎"],
] as const;

type ViewKey = (typeof nav)[number][0];
const nf = new Intl.NumberFormat("fa-IR");
const money = (value: number) => `${nf.format(value)} ریال`;

const sales = [
  ["فروش-۱۴۰۵-۰۰۱۲", "کافه آوان", 1860000000, "پرداخت‌شده"],
  ["فروش-۱۴۰۵-۰۰۱۱", "رستوران هفت‌خوان", 2470000000, "بخشی دریافت شده"],
  ["فروش-۱۴۰۵-۰۰۱۰", "فروشگاه آریا", 980000000, "سررسیدشده"],
] as const;

const purchases = [
  ["خرید-۱۴۰۵-۰۰۸۱", "پخش سپهر", 1240000000, "ثبت قطعی"],
  ["خرید-۱۴۰۵-۰۰۸۰", "تأمین ایرانیان", 780000000, "در انتظار پرداخت"],
  ["خرید-۱۴۰۵-۰۰۷۹", "بازرگانی نیل", 2100000000, "پرداخت‌شده"],
] as const;

function Card({ title, value, note }: { title: string; value: string; note?: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="text-xs font-black text-slate-500">{title}</div><div className="mt-3 text-xl font-black text-[#102845]">{value}</div>{note ? <div className="mt-2 text-[11px] text-slate-400">{note}</div> : null}</div>;
}

function Table({ rows }: { rows: readonly (readonly [string, string, number, string])[] }) {
  return <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[680px] text-right text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">شماره</th><th className="p-4">طرف حساب</th><th className="p-4">مبلغ</th><th className="p-4">وضعیت</th></tr></thead><tbody>{rows.map((row) => <tr key={row[0]} className="border-t"><td className="p-4 font-black">{row[0]}</td><td className="p-4">{row[1]}</td><td className="p-4 font-black">{money(row[2])}</td><td className="p-4"><span className="rounded-lg bg-[#edf8f7] px-2 py-1 font-black text-[#087f78]">{row[3]}</span></td></tr>)}</tbody></table></div>;
}

export function FinancialDemo() {
  const [view, setView] = useState<ViewKey>("dashboard");
  const [notice, setNotice] = useState("");
  const title = nav.find(([key]) => key === view)?.[1] ?? "داشبورد";
  const simulate = (label: string) => { setNotice(`${label} در دمو شبیه‌سازی شد؛ هیچ داده واقعی ثبت نشد.`); window.setTimeout(() => setNotice(""), 2500); };

  return <main dir="rtl" className="min-h-screen bg-[#f4f7fa] text-[#101827]">
    <div dir="ltr" className="mx-auto min-h-screen max-w-[1720px] lg:grid lg:grid-cols-[minmax(0,1fr)_282px]">
      <section dir="rtl" className="min-w-0">
        <header className="sticky top-0 z-30 flex min-h-[76px] items-center justify-between border-b bg-white/95 px-5 lg:px-8">
          <div><div className="text-[11px] font-black text-[#008f87]">فضای نمایشی · داده‌های ساختگی</div><h1 className="mt-1 text-2xl font-black text-[#0f223d]">{title}</h1></div>
          <div className="flex gap-2"><button onClick={() => simulate("عملیات جدید")} className="rounded-xl bg-[#102845] px-4 py-2.5 text-xs font-black text-white">عملیات جدید +</button><Link href="/" className="rounded-xl border bg-white px-4 py-2.5 text-xs font-black">خروج</Link></div>
        </header>
        {notice ? <div className="mx-5 mt-4 rounded-xl border border-[#9ee7e1] bg-[#ecfbf9] p-3 text-xs font-bold text-[#087f78]">{notice}</div> : null}
        <div className="p-5 lg:p-8">
          {view === "dashboard" ? <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Card title="فروش این ماه" value={money(24680000000)} note="۱۲.۴٪ رشد"/><Card title="موجودی نقد" value={money(18420000000)} note="بانک و صندوق"/><Card title="دریافتنی" value={money(7820000000)} note="۳ فاکتور سررسیدشده"/><Card title="پرداختنی" value={money(5310000000)} note="۲ پرداخت نزدیک"/></div><div className="mt-5 grid gap-5 xl:grid-cols-2"><div className="rounded-2xl border bg-white p-5"><div className="text-xs font-black text-[#008f87]">تصویر مالی</div><div className="mt-4 grid grid-cols-2 gap-3"><Card title="درآمد" value={money(24680000000)}/><Card title="هزینه" value={money(20430000000)}/><Card title="سود خالص" value={money(4250000000)}/><Card title="سرمایه در گردش" value={money(20930000000)}/></div></div><div className="rounded-2xl border bg-white p-5"><div className="text-xs font-black text-[#008f87]">اقدام سریع</div><div className="mt-4 grid grid-cols-2 gap-3">{["فاکتور فروش","ثبت خرید","دریافت / پرداخت","ثبت چک"].map((label) => <button key={label} onClick={() => simulate(label)} className="min-h-24 rounded-xl border bg-slate-50 p-4 text-right text-sm font-black">{label}<span className="mt-5 block text-xs text-[#008f87]">شروع ←</span></button>)}</div></div></div><div className="mt-5"><Table rows={sales}/></div></> : null}
          {view === "sales" ? <Table rows={sales}/> : null}
          {view === "purchases" ? <Table rows={purchases}/> : null}
          {view === "treasury" ? <div className="grid gap-4 md:grid-cols-3"><Card title="بانک سامان" value={money(8960000000)} note="فعال"/><Card title="بانک ملت" value={money(7240000000)} note="فعال"/><Card title="صندوق مرکزی" value={money(2220000000)} note="فعال"/></div> : null}
          {view === "cheques" ? <div className="grid gap-4 md:grid-cols-3"><Card title="چک دریافتی ۸۴۲۱" value={money(1900000000)} note="سررسید ۱۴۰۵/۰۷/۱۸"/><Card title="چک پرداختی ۳۱۱۷" value={money(860000000)} note="سررسید ۱۴۰۵/۰۷/۲۱"/><Card title="چک وصول‌شده ۷۷۰۲" value={money(1250000000)} note="وصول‌شده"/></div> : null}
          {view === "accounting" ? <div className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl border bg-white p-5"><h2 className="font-black">تراز آزمایشی</h2>{[["1101","صندوق",2220000000],["1102","بانک‌ها",16200000000],["1201","دریافتنی",7820000000],["2101","پرداختنی",5310000000]].map(([code,name,balance]) => <div key={code as string} className="mt-3 grid grid-cols-[70px_1fr_auto] rounded-xl border p-3 text-xs"><b>{code}</b><span>{name}</span><b>{money(balance as number)}</b></div>)}</div><div className="rounded-2xl border bg-white p-5"><h2 className="font-black">کنترل دفتر</h2><div className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><span>اسناد ثبت قطعی</span><b>۱۲۸</b></div><div className="flex justify-between"><span>پیش‌نویس</span><b>۴</b></div><div className="flex justify-between"><span>اختلاف تراز</span><b className="text-[#008f87]">۰ ریال</b></div></div></div></div> : null}
          {view === "reports" ? <div className="grid gap-4 md:grid-cols-3"><Card title="صورت سود و زیان" value={money(4250000000)} note="سود خالص"/><Card title="ترازنامه" value={money(38940000000)} note="جمع دارایی‌ها"/><Card title="جریان وجوه نقد" value={money(3180000000)} note="جریان خالص"/></div> : null}
          {view === "payroll" ? <div className="grid gap-4 md:grid-cols-3"><Card title="کارکنان فعال" value="۱۸ نفر"/><Card title="حقوق ناخالص" value={money(4860000000)}/><Card title="خالص پرداختنی" value={money(4120000000)}/></div> : null}
          {view === "assets" ? <div className="grid gap-4 md:grid-cols-3"><Card title="تجهیزات فروشگاه" value={money(5440000000)} note="ارزش دفتری"/><Card title="خودرو" value={money(7360000000)} note="ارزش دفتری"/><Card title="تجهیزات اداری" value={money(1920000000)} note="ارزش دفتری"/></div> : null}
          {view === "audit" ? <div className="grid gap-5 xl:grid-cols-2"><div className="rounded-2xl border bg-white p-5"><h2 className="font-black">ردپای حسابرسی</h2>{["ثبت دریافت مشتری","وصول چک","ثبت سند حسابداری","افزودن مستند مالی"].map((label, index) => <div key={label} className="mt-3 rounded-xl border p-3 text-xs"><b>{label}</b><div className="mt-2 text-slate-400">رویداد #{nf.format(128-index)} · ثبت غیرقابل‌تغییر</div></div>)}</div><div className="rounded-2xl border bg-white p-5"><h2 className="font-black">مستندات مالی</h2>{["invoice-0012.pdf","receipt-8421.jpg","bank-statement.xlsx"].map((name) => <div key={name} className="mt-3 rounded-xl bg-slate-50 p-4 text-xs"><b dir="ltr">{name}</b><div className="mt-2 text-[#008f87]">SHA-256 تأییدشده</div></div>)}</div></div> : null}
        </div>
      </section>
      <aside dir="rtl" className="hidden bg-[linear-gradient(180deg,#0c2945,#08253f)] text-white lg:block"><div className="sticky top-0 flex h-screen flex-col p-4"><button onClick={() => setView("dashboard")} className="mb-5 flex items-center gap-3 p-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#22d3c5] text-lg font-black text-[#09263f]">ت</div><div className="text-right"><div className="text-xl font-black">تسوین</div><div className="text-[10px] text-white/45">دموی سیستم مالی</div></div></button><nav className="space-y-1 overflow-y-auto">{nav.map(([key,label,icon]) => <button key={key} onClick={() => setView(key)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right text-[13px] font-bold ${view===key?"bg-[#008f87] text-white":"text-white/70 hover:bg-white/10"}`}><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-[#55e1d6]">{icon}</span>{label}</button>)}</nav><div className="mt-auto rounded-2xl bg-white/5 p-4 text-[10px] leading-5 text-white/50">تمام اعداد ساختگی‌اند؛ هیچ عملیات بانکی، مالیاتی یا Production انجام نمی‌شود.</div></div></aside>
    </div>
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-white p-1.5 lg:hidden">{nav.slice(0,5).map(([key,label,icon]) => <button key={key} onClick={() => setView(key)} className={`min-h-14 rounded-xl text-[10px] font-bold ${view===key?"bg-[#eafaf8] text-[#008f87]":"text-slate-500"}`}><span className="block text-base">{icon}</span>{label}</button>)}</nav>
  </main>;
}
