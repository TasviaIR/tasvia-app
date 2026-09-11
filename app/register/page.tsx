import type { Metadata } from "next";
import { RegistrationForm } from "./registration-form";

export const metadata: Metadata = {
  title: "ثبت‌نام ۱۵ روز رایگان تسوین",
  description: "حساب تسوین خود را بسازید و پس از تأیید ایمیل و موبایل، کسب‌وکار حسابداری خود را راه‌اندازی کنید.",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#f4f7fb] px-4 py-8 text-[#0b1220] sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 text-center">
          <div className="text-sm font-black text-[#008f87]">تسوین</div>
          <h1 className="mt-2 text-3xl font-black">۱۵ روز رایگان شروع کنید</h1>
          <p className="mt-3 text-sm leading-7 text-[#657184]">
            ابتدا حساب کاربری را بسازید؛ سپس ایمیل و موبایل را تأیید می‌کنیم و مرحله راه‌اندازی کسب‌وکار آغاز می‌شود.
          </p>
        </div>
        <RegistrationForm />
      </div>
    </main>
  );
}
