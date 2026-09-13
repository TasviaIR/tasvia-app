"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Channel = "EMAIL" | "PHONE";

type VerificationState = {
  emailVerified: boolean;
  phoneVerified: boolean;
  email?: string | null;
  phone?: string | null;
};

export function VerificationPanel() {
  const router = useRouter();
  const [state, setState] = useState<VerificationState>({
    emailVerified: false,
    phoneVerified: false,
  });
  const [emailCode, setEmailCode] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [debugEmailCode, setDebugEmailCode] = useState("");
  const [debugPhoneCode, setDebugPhoneCode] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/onboarding/verification/status", {
      cache: "no-store",
    }).then(async (response) => {
      if (cancelled) {
        return;
      }

      if (response.status === 401) {
        router.replace("/sign-in?next=/verify");
        return;
      }

      if (response.ok) {
        const payload = (await response.json()) as VerificationState;

        if (!cancelled) {
          setState(payload);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function requestCode(channel: Channel) {
    setMessage("");
    const response = await fetch("/api/onboarding/verification/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel }),
    });
    const payload = await response.json();

    if (!response.ok) {
      setMessage(
        payload.error === "VERIFICATION_PROVIDER_NOT_CONFIGURED"
          ? "سرویس ارسال کد Production هنوز پیکربندی نشده است."
          : "ارسال کد انجام نشد.",
      );
      return;
    }

    if (payload.debugCode) {
      if (channel === "EMAIL") setDebugEmailCode(payload.debugCode);
      if (channel === "PHONE") setDebugPhoneCode(payload.debugCode);
    }
    setMessage("کد تأیید صادر شد.");
  }

  async function confirm(channel: Channel, code: string) {
    setMessage("");
    const response = await fetch("/api/onboarding/verification/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, code }),
    });
    const payload = await response.json();

    if (!response.ok) {
      setMessage("کد معتبر نیست یا منقضی شده است.");
      return;
    }

    setState((current) => ({
      ...current,
      emailVerified: payload.emailVerified,
      phoneVerified: payload.phoneVerified,
    }));

    if (payload.emailVerified && payload.phoneVerified) {
      router.replace("/onboarding");
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <VerificationCard
        title="تأیید ایمیل"
        destination={state.email ?? ""}
        verified={state.emailVerified}
        code={emailCode}
        setCode={setEmailCode}
        debugCode={debugEmailCode}
        onRequest={() => requestCode("EMAIL")}
        onConfirm={() => confirm("EMAIL", emailCode)}
      />
      <VerificationCard
        title="تأیید موبایل"
        destination={state.phone ?? ""}
        verified={state.phoneVerified}
        code={phoneCode}
        setCode={setPhoneCode}
        debugCode={debugPhoneCode}
        onRequest={() => requestCode("PHONE")}
        onConfirm={() => confirm("PHONE", phoneCode)}
      />

      {message ? (
        <div className="rounded-2xl border border-black/5 bg-white p-4 text-sm font-bold">{message}</div>
      ) : null}

      <div className="rounded-2xl bg-[#eef9f8] p-4 text-xs leading-6 text-[#35615e]">
        در Preview محلی، کد آزمایشی برای QA روی صفحه نمایش داده می‌شود. در Production نمایش کد ممنوع است و ارسال باید از Provider تأییدشده انجام شود.
      </div>
    </div>
  );
}

function VerificationCard(props: {
  title: string;
  destination: string;
  verified: boolean;
  code: string;
  setCode: (value: string) => void;
  debugCode: string;
  onRequest: () => void;
  onConfirm: () => void;
}) {
  return (
    <section className="rounded-[28px] border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-black">{props.title}</h2>
          <p className="mt-1 text-xs text-[#657184]">{props.destination}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${props.verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {props.verified ? "تأیید شده" : "در انتظار"}
        </span>
      </div>

      {!props.verified ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <input
            inputMode="numeric"
            maxLength={6}
            value={props.code}
            onChange={(event) => props.setCode(event.target.value.replace(/\D/g, ""))}
            placeholder="کد ۶ رقمی"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          />
          <button type="button" onClick={props.onRequest} className="rounded-2xl border border-[#008f87]/30 px-4 py-3 text-xs font-black text-[#00776f]">
            ارسال کد
          </button>
          <button type="button" onClick={props.onConfirm} className="rounded-2xl bg-[#0f223d] px-4 py-3 text-xs font-black text-white">
            تأیید
          </button>
        </div>
      ) : null}

      {props.debugCode ? (
        <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs">
          کد QA محلی: <strong dir="ltr">{props.debugCode}</strong>
        </div>
      ) : null}
    </section>
  );
}
