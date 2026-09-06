"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const items = [
  ["/app", "داشبورد", "▦"],
  ["/app/sales", "فروش", "◫"],
  ["/app/purchases", "خرید", "▣"],
  ["/app/treasury", "خزانه", "◉"],
  ["/app/inventory", "انبار", "◇"],
  ["/app/cheques", "چک‌ها", "▤"],
  ["/app/customers", "مشتریان", "♙"],
  ["/app/suppliers", "تأمین‌کنندگان", "♙"],
  ["/app/payroll", "حقوق و دستمزد", "₮"],
  ["/app/fixed-assets", "دارایی ثابت", "◆"],
  ["/accounting/professional", "حسابداری", "≡"],
  ["/app/settlements", "تسویه‌ها", "⇄"],
  ["/app/reconciliation", "مغایرت‌گیری", "◎"],
  ["/app/reports/financial", "گزارش‌ها", "▥"],
  ["/app/fiscal-close", "دوره مالی", "◷"],
  ["/app/commercial-controls", "کنترل‌های تجاری", "⌁"],
  ["/app/operations-controls", "عملیات", "⚙"],
  ["/app/subscription", "اشتراک", "★"],
  ["/app/api-keys", "اتصال API", "⌁"],
  ["/app/platform-controls", "تنظیمات", "⚑"],
] as const;

const mobilePrimary = [
  ["/app", "داشبورد", "▦"],
  ["/app/sales", "فروش", "◫"],
  ["/app/purchases", "خرید", "▣"],
  ["/app/treasury", "خزانه", "◉"],
  ["/app/reports/financial", "گزارش", "▥"],
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function WorkspaceShell({
  children, title, eyebrow, actions,
}: {
  children: ReactNode;
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-[#f5f7fa] pb-20 text-[#101827] lg:pb-0" dir="rtl">
      <div
        dir="ltr"
        className="mx-auto min-h-screen max-w-[1720px] lg:grid lg:grid-cols-[minmax(0,1fr)_282px]"
      >
        <section dir="rtl" className="min-w-0 lg:col-start-1">
          <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
            <div className="flex min-h-[76px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
              <div className="min-w-0">
                {eyebrow ? <p className="text-[11px] font-extrabold text-[#008f87]">{eyebrow}</p> : null}
                <h1 className="mt-1 truncate text-[22px] font-black tracking-[-0.02em] text-[#0f223d] sm:text-[26px]">{title}</h1>
              </div>
              <div className="flex shrink-0 items-center gap-2">{actions}</div>
            </div>

            <nav aria-label="دسترسی سریع موبایل" className="flex gap-2 overflow-x-auto border-t border-slate-100 px-4 py-2 lg:hidden">
              {items.slice(5, 12).map(([href, label, icon]) => {
                const active = isActive(pathname, href);
                return (
                  <Link key={href} href={href} className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold transition ${active ? "bg-[#0f223d] text-white" : "bg-[#f2f5f8] text-[#536176]"}`}>
                    <span className="ml-1.5 text-[#13b9ad]">{icon}</span>{label}
                  </Link>
                );
              })}
            </nav>
          </header>

          <div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-7">{children}</div>
        </section>

        <aside
          dir="rtl"
          className="hidden border-l border-white/10 bg-[linear-gradient(180deg,#0c2945_0%,#08253f_100%)] text-white lg:col-start-2 lg:row-start-1 lg:block"
        >
          <div className="sticky top-0 flex h-screen flex-col px-4 py-5">
            <Link href="/app" className="mb-5 flex items-center justify-between rounded-2xl px-3 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#22d3c5] text-lg font-black text-[#09263f]">ت</div>
                <div>
                  <div className="text-[21px] font-black">تسوین</div>
                  <div className="mt-0.5 text-[10px] font-medium text-white/45">سیستم حسابداری هوشمند</div>
                </div>
              </div>
              <span className="text-lg text-white/55">≡</span>
            </Link>

            <nav aria-label="ناوبری اصلی محیط کاری" className="space-y-1 overflow-y-auto pl-1">
              {items.map(([href, label, icon]) => {
                const active = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold transition ${
                      active
                        ? "bg-[linear-gradient(90deg,#008f87,#09a79d)] text-white"
                        : "text-white/72 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-[13px] ${active ? "bg-white/14 text-white" : "bg-white/6 text-[#55e1d6]"}`}>{icon}</span>
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto border-t border-white/10 pt-4">
              <div className="rounded-2xl bg-white/[0.045] p-3.5">
                <div className="text-xs font-extrabold text-[#55e1d6]">حالت امن مالی</div>
                <p className="mt-2 text-[10.5px] leading-5 text-white/48">
                  اتصال بانکی، سرویس مالیاتی و ثبت عملیاتی Production فقط پس از مجوز مستقل فعال می‌شوند.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <nav aria-label="ناوبری اصلی موبایل" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white/95 px-1 pb-[max(.35rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_30px_rgba(15,34,61,.08)] backdrop-blur lg:hidden">
        {mobilePrimary.map(([href, label, icon]) => {
          const active = isActive(pathname, href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center rounded-xl text-[10px] font-bold transition ${active ? "bg-[#eafaf8] text-[#008f87]" : "text-[#718096]"}`}>
              <span className="mb-1 text-base">{icon}</span>{label}
            </Link>
          );
        })}
      </nav>
    </main>
  );
}
