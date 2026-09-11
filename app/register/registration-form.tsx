"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "../../src/lib/auth-client";

export function RegistrationForm() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const form = new FormData(event.currentTarget);
    const firstName = String(form.get("firstName") ?? "").trim();
    const lastName = String(form.get("lastName") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const passwordConfirm = String(form.get("passwordConfirm") ?? "");
    const referralSource = String(form.get("referralSource") ?? "").trim();
    const termsAccepted = form.get("termsAccepted") === "on";

    if (password !== passwordConfirm) {
      setStatus("error");
      setMessage("تکرار رمز عبور با رمز عبور یکسان نیست.");
      return;
    }

    const signUp = await authClient.signUp.email({
      name: `${firstName} ${lastName}`.trim(),
      email,
      password,
    });

    if (signUp.error) {
      setStatus("error");
      setMessage("ثبت‌نام انجام نشد. ایمیل یا اطلاعات حساب را بررسی کنید.");
      return;
    }

    // Ensure a session exists before persisting the extended onboarding profile.
    await authClient.signIn.email({ email, password });

    const profileResponse = await fetch("/api/onboarding/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        phone,
        referralSource,
        termsAccepted,
      }),
    });

    if (!profileResponse.ok) {
      setStatus("error");
      setMessage(
        profileResponse.status === 409
          ? "این شماره موبایل قبلاً استفاده شده است."
          : "اطلاعات ثبت‌نام معتبر نیست. موارد الزامی را بررسی کنید.",
      );
      return;
    }

    router.replace("/verify");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="firstName" label="نام" required autoComplete="given-name" />
        <Field name="lastName" label="نام خانوادگی" required autoComplete="family-name" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field name="phone" label="موبایل" required type="tel" placeholder="09121234567" autoComplete="tel" />
        <Field name="email" label="ایمیل" required type="email" placeholder="name@company.com" autoComplete="email" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field name="password" label="رمز عبور" required type="password" minLength={8} autoComplete="new-password" />
        <Field name="passwordConfirm" label="تکرار رمز عبور" required type="password" minLength={8} autoComplete="new-password" />
      </div>

      <label className="mt-4 block">
        <span className="mb-2 block text-xs font-black text-[#4d596b]">چطور با تسوین آشنا شدید؟ (اختیاری)</span>
        <select name="referralSource" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
          <option value="">انتخاب کنید</option>
          <option value="search">جست‌وجوی اینترنت</option>
          <option value="friend">معرفی دوست یا همکار</option>
          <option value="social">شبکه‌های اجتماعی</option>
          <option value="other">سایر</option>
        </select>
      </label>

      <label className="mt-5 flex items-start gap-3 text-xs leading-6 text-[#4d596b]">
        <input name="termsAccepted" type="checkbox" required className="mt-1 size-4" />
        <span>شرایط استفاده و سیاست حریم خصوصی تسوین را مطالعه کرده‌ام و می‌پذیرم.</span>
      </label>

      {status === "error" ? (
        <div role="alert" className="mt-4 rounded-2xl bg-[#fff0f0] p-3 text-xs font-bold text-[#8d2c2c]">
          {message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={status === "loading"}
        className="mt-6 min-h-12 w-full rounded-2xl bg-[#0f223d] px-5 py-3 text-sm font-black text-white disabled:opacity-60"
      >
        {status === "loading" ? "در حال ساخت حساب…" : "ثبت‌نام و شروع ۱۵ روز رایگان"}
      </button>

      <p className="mt-5 text-center text-xs text-[#657184]">
        قبلاً ثبت‌نام کرده‌اید؟{" "}
        <Link href="/sign-in" className="font-black text-[#008f87]">وارد شوید</Link>
      </p>
    </form>
  );
}

function Field(props: {
  name: string;
  label: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  minLength?: number;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black text-[#4d596b]">
        {props.label}{props.required ? <span className="mr-1 text-red-500">*</span> : null}
      </span>
      <input
        {...props}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#008f87]"
      />
    </label>
  );
}
