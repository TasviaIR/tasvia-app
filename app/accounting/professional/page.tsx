import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "حسابداری حرفه‌ای تسوین",
  description: "فضای حرفه‌ای اسناد، دفاتر، کنترل‌ها و صورت‌های مالی تسوین.",
  alternates: { canonical: "/accounting/professional" },
};

const modules = [
  ["اسناد حسابداری", "پیش‌نویس، ثبت قطعی، برگشت و سابقه حسابرسی"],
  ["دفتر روزنامه", "مرور زمانی ثبت‌ها و منبع هر رویداد مالی"],
  ["دفتر کل و معین", "گردش و مانده حساب‌ها با Drill-down"],
  ["تراز آزمایشی", "کنترل بدهکار و بستانکار و مانده حساب‌ها"],
  ["سود و زیان", "درآمد، هزینه و نتیجه عملکرد دوره"],
  ["ترازنامه", "دارایی، بدهی و حقوق مالکانه"],
  ["جریان نقد", "ورودی و خروجی نقد و وضعیت نقدینگی"],
  ["مراکز هزینه", "تحلیل شعبه، پروژه و ابعاد مدیریتی"],
];

export default function ProfessionalAccountingPage() {
  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]" dir="rtl">
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <div className="rounded-[32px] bg-[#0f223d] p-6 text-white sm:p-8 lg:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs font-black text-[#63dfd4]">حالت حرفه‌ای</div>
              <h1 className="mt-3 text-3xl font-black sm:text-4xl">کنترل حسابداری، بدون جدا شدن از عملیات واقعی کسب‌وکار.</h1>
              <p className="mt-4 max-w-3xl text-sm leading-8 text-white/70">هر عدد باید از صورت مالی تا حساب، سند و مدرک منبع قابل پیگیری باشد. ثبت قطعی با حذف بی‌ردپا اصلاح نمی‌شود؛ برگشت و سابقه حسابرسی اصل است.</p>
            </div>
            <Link href="/accounting/simple" className="min-h-11 rounded-2xl bg-white px-5 py-3 text-center text-sm font-black text-[#0f223d]">رفتن به حالت ساده</Link>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Link
            href="/app/dimensions/assignments"
            className="rounded-2xl border border-[#008f87]/20 bg-[#f1fbfa] px-5 py-3 text-sm font-black text-[#00776f]"
          >
            تخصیص شعبه، مرکز هزینه و پروژه به اسناد ←
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map(([title, description]) => (
            <article key={title} className="rounded-[26px] border border-black/5 bg-white p-5">
              <h2 className="font-black">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-[#657184]">{description}</p>
              <div className="mt-5 text-xs font-black text-[#008f87]">ورود به ماژول ←</div>
            </article>
          ))}
        </div>

        <section className="mt-6 rounded-[28px] border border-black/5 bg-white p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-3">
            <div>
              <div className="text-xs font-black text-[#008f87]">کنترل دوره</div>
              <h2 className="mt-2 text-xl font-black">سال مالی و دوره‌های حسابداری</h2>
              <p className="mt-3 text-sm leading-7 text-[#657184]">افتتاحیه، وضعیت دوره و قفل کنترل‌شده باید پیش از تغییر ثبت‌های مالی اعمال شوند.</p>
            </div>
            <div>
              <div className="text-xs font-black text-[#008f87]">کنترل سند</div>
              <h2 className="mt-2 text-xl font-black">توازن اجباری</h2>
              <p className="mt-3 text-sm leading-7 text-[#657184]">هیچ سند حسابداری نامتوازن نباید امکان ثبت قطعی پیدا کند.</p>
            </div>
            <div>
              <div className="text-xs font-black text-[#008f87]">شواهد</div>
              <h2 className="mt-2 text-xl font-black">قابل حسابرسی از ابتدا تا انتها</h2>
              <p className="mt-3 text-sm leading-7 text-[#657184]">منبع عملیات، کاربر، زمان، تغییرات و مدارک مرتبط بخشی از زنجیره حسابرسی هستند.</p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
