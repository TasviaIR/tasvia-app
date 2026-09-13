export type VerificationChannel = "EMAIL" | "PHONE";

export type VerificationDeliveryInput = {
  channel: VerificationChannel;
  destination: string;
  code: string;
  expiresInMinutes: number;
};

export type VerificationDeliveryResult =
  | {
      delivered: true;
      provider: "console" | "resend" | "kavenegar";
      messageId?: string;
    }
  | {
      delivered: false;
      provider: "resend" | "kavenegar" | "configuration";
      reason: string;
    };

function env(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

async function deliverEmailWithResend(
  input: VerificationDeliveryInput,
): Promise<VerificationDeliveryResult> {
  const apiKey = env("RESEND_API_KEY");
  const from = env("RESEND_FROM_EMAIL");

  if (!apiKey || !from) {
    return {
      delivered: false,
      provider: "configuration",
      reason: "RESEND_NOT_CONFIGURED",
    };
  }

  let response: Response;

  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.destination],
        subject: "کد تأیید تسوین",
        text:
          `کد تأیید شما در تسوین: ${input.code}\n` +
          `این کد تا ${input.expiresInMinutes} دقیقه معتبر است.`,
        html:
          `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif">` +
          `<h2>تأیید حساب تسوین</h2>` +
          `<p>کد تأیید شما:</p>` +
          `<p style="font-size:28px;font-weight:700;letter-spacing:4px">${input.code}</p>` +
          `<p>این کد تا ${input.expiresInMinutes} دقیقه معتبر است.</p>` +
          `</div>`,
        tags: [
          {
            name: "category",
            value: "account_verification",
          },
        ],
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch {
    return {
      delivered: false,
      provider: "resend",
      reason: "RESEND_UNREACHABLE",
    };
  }

  if (!response.ok) {
    return {
      delivered: false,
      provider: "resend",
      reason: `RESEND_HTTP_${response.status}`,
    };
  }

  try {
    const payload = (await response.json()) as { id?: unknown };

    return {
      delivered: true,
      provider: "resend",
      messageId:
        typeof payload.id === "string" ? payload.id : undefined,
    };
  } catch {
    return {
      delivered: true,
      provider: "resend",
    };
  }
}

async function deliverSmsWithKavenegar(
  input: VerificationDeliveryInput,
): Promise<VerificationDeliveryResult> {
  const apiKey = env("KAVENEGAR_API_KEY");
  const template = env("KAVENEGAR_VERIFY_TEMPLATE");

  if (!apiKey || !template) {
    return {
      delivered: false,
      provider: "configuration",
      reason: "KAVENEGAR_NOT_CONFIGURED",
    };
  }

  const endpoint =
    `https://api.kavenegar.com/v1/${encodeURIComponent(apiKey)}` +
    "/verify/lookup.json";

  const body = new URLSearchParams({
    receptor: input.destination,
    token: input.code,
    template,
    type: "sms",
  });

  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch {
    return {
      delivered: false,
      provider: "kavenegar",
      reason: "KAVENEGAR_UNREACHABLE",
    };
  }

  if (!response.ok) {
    return {
      delivered: false,
      provider: "kavenegar",
      reason: `KAVENEGAR_HTTP_${response.status}`,
    };
  }

  try {
    const payload = (await response.json()) as {
      return?: {
        status?: unknown;
      };
      entries?: {
        messageid?: unknown;
      } | Array<{
        messageid?: unknown;
      }>;
    };

    if (payload.return?.status !== 200) {
      return {
        delivered: false,
        provider: "kavenegar",
        reason: "KAVENEGAR_API_REJECTED",
      };
    }

    const entry = Array.isArray(payload.entries)
      ? payload.entries[0]
      : payload.entries;

    const rawId = entry?.messageid;

    return {
      delivered: true,
      provider: "kavenegar",
      messageId:
        typeof rawId === "number" || typeof rawId === "string"
          ? String(rawId)
          : undefined,
    };
  } catch {
    return {
      delivered: false,
      provider: "kavenegar",
      reason: "KAVENEGAR_INVALID_RESPONSE",
    };
  }
}

export async function deliverVerificationCode(
  input: VerificationDeliveryInput,
): Promise<VerificationDeliveryResult> {
  const mode =
    process.env.ONBOARDING_VERIFICATION_MODE?.trim() || "console";

  if (mode === "providers") {
    return input.channel === "EMAIL"
      ? deliverEmailWithResend(input)
      : deliverSmsWithKavenegar(input);
  }

  if (process.env.NODE_ENV === "production") {
    return {
      delivered: false,
      provider: "configuration",
      reason: "PRODUCTION_PROVIDER_NOT_CONFIGURED",
    };
  }

  // Local QA only. OTP is returned by the request route only outside production.
  return {
    delivered: true,
    provider: "console",
  };
}
