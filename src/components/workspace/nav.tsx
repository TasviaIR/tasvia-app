import Link from "next/link";

const items = [
  ["/app", "نمای کلی"],
  ["/app/sales", "فروش"],
  ["/app/purchases", "خرید"],
  ["/app/treasury", "خزانه"],
  ["/app/inventory", "انبار"],
  ["/app/dimensions", "شعب و ابعاد مالی"],
  ["/app/suppliers", "تأمین‌کنندگان"],
  ["/app/settlements", "تسویه‌ها"],
  ["/app/reconciliation", "مغایرت‌گیری"],
  ["/app/commercial-controls", "تجاری"],
  ["/app/operations-controls", "عملیاتی"],
  ["/app/platform-controls", "انطباق و اتصال"],
  ["/app/alerts", "هشدارها"],
  ["/app/reports/financial", "گزارش‌های مالی"],
  ["/app/audit", "ردپای حسابرسی"],
  ["/app/evidence", "مستندات مالی"],
  ["/accounting/simple", "ثبت ساده"],
  ["/accounting/professional", "حسابداری حرفه‌ای"],
] as const;

export function WorkspaceNav() {
  return (
    <nav aria-label="ناوبری محیط کاری" className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]">
      {items.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          className="whitespace-nowrap rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-extrabold text-[#344154] transition hover:border-[#008f87]/40 hover:bg-[#f1fbfa] hover:text-[#00776f]"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
