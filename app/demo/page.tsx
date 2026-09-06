import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "دموی محصول",
  description: "ورود به دموی تعاملی محیط مالی تسوین با داده‌های ساختگی و بدون عملیات Production.",
  alternates: { canonical: "/demo" },
  robots: { index: false, follow: false },
};

const tour = [
  ["مرکز فرمان مالی", "داشبورد، KPI، نقدینگی، دریافتنی و پرداختنی"],
  ["فروش و خرید", "فاکتور، طرف حساب، مانده و وضعیت وصول/پرداخت"],
  ["خزانه و چک", "بانک، صندوق، چک‌های دریافتی و پرداختی"],
  ["حسابداری", "تراز آزمایشی، دفتر و کنترل ثبت قطعی"],
  ["گزارش‌های مالی", "سود و زیان، ترازنامه و جریان وجوه نقد"],
  ["حقوق و دارایی", "حقوق و دستمزد، دارایی ثابت و استهلاک"],
  ["حسابرسی", "Audit Trail و مستندات مالی Evidence"],
] as const;

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-[#0f223d] px-4 py-12 text-white sm:px-6" dir="rtl">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-4xl">
          <div className="text-xs font-black text-[#63dfd4]">دموی تعاملی محصول</div>
          <h1 className="mt-3 text-4xl font-black">وارد محیط واقعی‌نمای نرم‌افزار مالی تسوین شو.</h1>
          <p className="mt-5 text-base leading-8 text-white/70">این محیط برای دیدن تجربه خود نرم‌افزار ساخته شده است؛ تمام اعداد و طرف‌حساب‌ها ساختگی‌اند و هیچ انتقال وجه، اتصال بانکی، ارسال مالیاتی یا عملیات Production انجام نمی‌شود.</p>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tour.map(([title, text]) => (
            <div key={title} className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="font-black text-[#63dfd4]">{title}</div>
              <p className="mt-3 text-sm leading-7 text-white/65">{text}</p>
            </div>
          ))}
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/demo/app" className="rounded-2xl bg-white px-5 py-4 text-sm font-black text-[#0f223d]">ورود به محیط مالی تسوین</Link>
          <Link href="/product" className="rounded-2xl border border-white/20 px-5 py-4 text-sm font-black">مرور کامل محصول</Link>
          <Link href="/" className="px-3 py-4 text-sm font-bold text-white/70">بازگشت به سایت رسمی</Link>
        </div>
      </div>
    </main>
  );
}
