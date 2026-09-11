import type { ReactNode } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, authConfigured } from "../../src/lib/auth";
import { resolveFirstActiveWorkspaceMembership } from "../../src/domain/workspace/repository";
import { evaluateWorkspaceGate } from "../../src/auth/workspace-gate";

export default async function WorkspaceLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  if (!authConfigured) {
    return (
      <main className="min-h-screen bg-[#f3f6fa] px-4 py-12 text-[#0b1220] sm:px-6">
        <div className="mx-auto max-w-xl rounded-[32px] border border-black/5 bg-white p-7 shadow-sm sm:p-9">
          <div className="text-xs font-black text-[#008f87]">پیش‌نمایش امن تسوین</div>
          <h1 className="mt-3 text-3xl font-black">محیط کاری در این Preview به احراز هویت متصل نشده است.</h1>
          <p className="mt-4 text-sm leading-7 text-[#657184]">
            صفحات عمومی برای بررسی طراحی و تجربه کاربری در دسترس‌اند، اما ورود و Workspace تا زمانی که Secret و دیتابیس غیرProduction معتبر برای Preview تنظیم نشوند، عمداً غیرفعال می‌مانند.
          </p>
          <div className="mt-6 rounded-2xl bg-[#eafaf8] p-4 text-xs leading-6 text-[#315b59]">
            این رفتار fail-closed است و هیچ دسترسی آزمایشی بدون پیکربندی معتبر ایجاد نمی‌کند.
          </div>
          <Link href="/" className="mt-6 inline-flex rounded-2xl bg-[#0f223d] px-5 py-3 text-sm font-black text-white">
            بازگشت به سایت
          </Link>
        </div>
      </main>
    );
  }

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session?.user?.id) {
    redirect("/sign-in?next=/app");
  }

  const membership = await resolveFirstActiveWorkspaceMembership(session.user.id);
  const gate = evaluateWorkspaceGate(session.user.id, membership);

  if (gate.state === "MEMBERSHIP_REQUIRED") {
    return (
      <main dir="rtl" className="min-h-screen bg-[#f3f6fa] px-4 py-12 text-[#0b1220] sm:px-6">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-black/5 bg-white p-7 shadow-sm sm:p-9">
          <div className="text-xs font-black text-[#008f87]">خانه تسوین</div>
          <h1 className="mt-3 text-3xl font-black">هنوز کسب‌وکاری در تسوین راه‌اندازی نکرده‌اید.</h1>
          <p className="mt-4 text-sm leading-7 text-[#657184]">برای شروع ۱۵ روز رایگان، کسب‌وکار خود را بسازید و تنظیمات اولیه حسابداری، انبار، مالیات و سال مالی را تکمیل کنید.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#f7f9fc] p-4 text-xs leading-6"><strong className="block">۱۵ روز رایگان</strong>Trial بعد از تکمیل راه‌اندازی شروع می‌شود.</div>
            <div className="rounded-2xl bg-[#f7f9fc] p-4 text-xs leading-6"><strong className="block">۳ مرحله کوتاه</strong>کسب‌وکار، اطلاعات و حسابداری.</div>
            <div className="rounded-2xl bg-[#f7f9fc] p-4 text-xs leading-6"><strong className="block">قابل ادامه</strong>اطلاعات هر مرحله ذخیره می‌شود.</div>
          </div>
          <Link href="/onboarding" className="mt-7 inline-flex min-h-12 items-center rounded-2xl bg-[#0f223d] px-6 py-3 text-sm font-black text-white">راه‌اندازی کسب‌وکار جدید</Link>
        </div>
      </main>
    );
  }
  if (gate.state !== "ALLOWED") {
    redirect("/sign-in?next=/app");
  }

  return (
    <>
      <div className="border-b border-[#008f87]/10 bg-[#eafaf8] px-4 py-2 text-center text-[11px] font-bold text-[#315b59]">
        Workspace فعال: {gate.membership.workspace.name} · نقش: {gate.membership.role}
        {" · "}
        داده‌های نمونه داخل UI همچنان نمایشی هستند مگر صراحتاً منبع واقعی داده مشخص شده باشد.
      </div>
      {children}
    </>
  );
}
