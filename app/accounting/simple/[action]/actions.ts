"use server";

import { headers } from "next/headers";
import { auth, authConfigured } from "../../../../src/lib/auth";
import { resolveFirstActiveWorkspaceMembership } from "../../../../src/domain/workspace/repository";
import { executeSimpleWorkflow, type SimplePersistedAction } from "../../../../src/application/accounting/simple-workflow-persistence";
import { parseJalaliDate } from "../../../../src/lib/tasvin-date";

export type SimpleActionState = {
  ok: boolean;
  message: string;
  journalId?: string;
};

const writableActions = new Set<SimplePersistedAction>(["sale", "purchase", "receipt", "payment", "expense"]);

function normalizeDigits(value: string): string {
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  const ar = "٠١٢٣٤٥٦٧٨٩";
  return value
    .replace(/[۰-۹]/g, (digit) => String(fa.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(ar.indexOf(digit)))
    .replace(/[,_،\s]/g, "");
}

function parsePositiveRials(value: FormDataEntryValue | null): bigint {
  const normalized = normalizeDigits(String(value ?? "").trim());
  if (!/^\d+$/.test(normalized)) throw new Error("مبلغ باید یک عدد صحیح ریالی باشد.");
  const amount = BigInt(normalized);
  if (amount <= 0n) throw new Error("مبلغ باید بیشتر از صفر باشد.");
  return amount;
}

function parseDate(value: FormDataEntryValue | null, fallback = new Date()): Date {
  if (!value) return fallback;
  try {
    return parseJalaliDate(String(value));
  } catch {
    throw new Error("تاریخ شمسی معتبر نیست.");
  }
}

function messageForError(error: unknown): string {
  const message = error instanceof Error ? error.message : "ثبت عملیات ناموفق بود.";
  const map: Record<string, string> = {
    FINANCIAL_WRITES_DISABLED: "ثبت مالی در این محیط هنوز فعال نشده است.",
    PRODUCTION_FINANCIAL_WRITES_NOT_APPROVED: "ثبت مالی Production مجوز نهایی ندارد.",
    OPEN_FISCAL_PERIOD_REQUIRED: "برای این تاریخ دوره مالی باز پیدا نشد.",
    COUNTERPARTY_REQUIRED: "مشتری یا تأمین‌کننده را انتخاب کنید.",
    INVALID_COUNTERPARTY: "طرف حساب انتخاب‌شده معتبر نیست.",
    CUSTOMER_REQUIRED: "برای فروش باید مشتری انتخاب شود.",
    SUPPLIER_REQUIRED: "برای خرید باید تأمین‌کننده انتخاب شود.",
    OPEN_BALANCE_REQUIRED: "طلب یا بدهی موردنظر را انتخاب کنید.",
    OPEN_BALANCE_NOT_FOUND: "مانده باز انتخاب‌شده پیدا نشد یا قبلاً تسویه شده است.",
    AMOUNT_EXCEEDS_OUTSTANDING_BALANCE: "مبلغ از مانده قابل تسویه بیشتر است.",
    INVALID_DUE_DATE: "سررسید نمی‌تواند قبل از تاریخ ثبت باشد.",
    AMOUNT_MUST_BE_POSITIVE: "مبلغ باید بیشتر از صفر باشد.",
  };
  if (map[message]) return map[message];
  if (message.startsWith("ACCOUNT_NOT_CONFIGURED:")) return `حساب پایه ${message.split(":")[1]} در Workspace تنظیم نشده است.`;
  return message;
}

export async function submitSimpleAccountingAction(
  _previousState: SimpleActionState,
  formData: FormData,
): Promise<SimpleActionState> {
  try {
    if (!authConfigured) return { ok: false, message: "احراز هویت این محیط پیکربندی نشده است." };

    const action = String(formData.get("action") ?? "") as SimplePersistedAction;
    if (!writableActions.has(action)) return { ok: false, message: "عملیات انتخاب‌شده قابل ثبت نیست." };

    const requestHeaders = await headers();
    const session = await auth.api.getSession({ headers: requestHeaders });
    if (!session?.user?.id) return { ok: false, message: "برای ثبت عملیات دوباره وارد حساب شوید." };

    const membership = await resolveFirstActiveWorkspaceMembership(session.user.id);
    if (!membership) return { ok: false, message: "Workspace فعال برای این حساب وجود ندارد." };
    if (membership.role === "VIEWER") return { ok: false, message: "نقش مشاهده‌گر اجازه ثبت مالی ندارد." };

    const occurredAt = parseDate(formData.get("occurredAt"));
    const commandId = String(formData.get("commandId") ?? "").trim();
    if (!commandId) return { ok: false, message: "شناسه امن عملیات ایجاد نشده است؛ صفحه را تازه‌سازی کنید." };

    const result = await executeSimpleWorkflow({
      action,
      workspaceId: membership.workspace.id,
      actorId: session.user.id,
      amountRials: parsePositiveRials(formData.get("amount")),
      occurredAt,
      counterpartyId: String(formData.get("counterpartyId") ?? "").trim() || undefined,
      openBalanceId: String(formData.get("openBalanceId") ?? "").trim() || undefined,
      dueAt: formData.get("dueAt") ? parseDate(formData.get("dueAt")) : undefined,
      description: String(formData.get("description") ?? "").trim() || undefined,
      idempotencyKey: `simple:${membership.workspace.id}:${commandId}`,
    });

    return {
      ok: true,
      message: result.idempotentReplay ? "این عملیات قبلاً ثبت شده بود و دوباره ثبت نشد." : "عملیات با موفقیت و به‌صورت متوازن ثبت شد.",
      journalId: result.journal.id,
    };
  } catch (error) {
    return { ok: false, message: messageForError(error) };
  }
}
