import type { Metadata } from "next";
import { VerificationPanel } from "./verification-panel";

export const metadata: Metadata = {
  title: "تأیید ایمیل و موبایل | تسوین",
  robots: { index: false, follow: false },
};

export default function VerifyPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#f4f7fb] px-4 py-10 text-[#0b1220]">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <div className="text-xs font-black text-[#008f87]">مرحله ۲ از ۵</div>
          <h1 className="mt-2 text-3xl font-black">تأیید اطلاعات تماس</h1>
          <p className="mt-3 text-sm leading-7 text-[#657184]">
            برای ورود به فضای حسابداری، ایمیل و شماره موبایل هر دو باید تأیید شوند.
          </p>
        </div>
        <VerificationPanel />
      </div>
    </main>
  );
}
