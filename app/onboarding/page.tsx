import type { Metadata } from "next";
import Link from "next/link";
import { createTrialWorkspaceAction } from "./actions";

export const metadata: Metadata = {
  title: "شروع ۱۵ روز رایگان تسوین",
  description: "فضای کاری حسابداری خود را بسازید و ۱۵ روز کامل تسوین را رایگان استفاده کنید.",
  robots: { index: false, follow: false },
};

export default function OnboardingPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#f4f7fb] px-4 py-10 text-[#0b1220] sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <div className="text-xs font-black text-[#008f87]">شروع تسوین</div>
          <h1 className="mt-2 text-3xl font-black">۱۵ روز استفاده کامل و رایگان</h1>
          <p className="mt-3 text-sm leading-7 text-[#657184]">
            فضای کاری واقعی شما همراه با اشتراک آزمایشی به‌صورت هم‌زمان ساخته می‌شود.
            پس از پایان دوره، اطلاعات حذف نمی‌شوند و تا فعال‌سازی اشتراک در حالت فقط‌خواندنی باقی می‌مانند.
          </p>
        </div>

        <form action={createTrialWorkspaceAction} className="space-y-5 rounded-[28px] border border-black/5 bg-white p-5 shadow-sm sm:p-7">
          <div>
            <label htmlFor="workspace-name" className="text-sm font-black">
              نام کسب‌وکار یا مجموعه
            </label>
            <input
              id="workspace-name"
              name="name"
              required
              minLength={2}
              maxLength={120}
              autoComplete="organization"
              placeholder="مثلاً کافه مرکزی"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#00a99d]"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#f7f9fc] p-4">
              <div className="text-xs font-black">۱۵ روز کامل</div>
              <div className="mt-1 text-xs leading-6 text-[#657184]">بدون حذف داده در پایان دوره</div>
            </div>
            <div className="rounded-2xl bg-[#f7f9fc] p-4">
              <div className="text-xs font-black">تمام امکانات طرح آغاز</div>
              <div className="mt-1 text-xs leading-6 text-[#657184]">برای ارزیابی واقعی محصول</div>
            </div>
            <div className="rounded-2xl bg-[#f7f9fc] p-4">
              <div className="text-xs font-black">امن و حسابرسی‌پذیر</div>
              <div className="mt-1 text-xs leading-6 text-[#657184]">نوشتن مالی فقط با مجوز اشتراک</div>
            </div>
          </div>

          <button
            type="submit"
            className="min-h-12 w-full rounded-2xl bg-[#0f223d] px-4 py-3 text-sm font-black text-white"
          >
            ساخت فضای کاری و شروع ۱۵ روز رایگان
          </button>

          <p className="text-center text-xs leading-6 text-[#657184]">
            حساب دارید؟{" "}
            <Link className="font-black text-[#008f87]" href="/sign-in?next=/onboarding">
              وارد شوید
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
