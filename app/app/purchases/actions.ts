"use server";

import { parseJalaliDate } from "../../../src/lib/tasvin-date";
import { revalidatePath } from "next/cache";
import { requireCurrentWorkspace } from "../../../src/auth/current-workspace";
import {
  approvePurchase,
  createPurchaseDraft,
  postPurchase,
  submitPurchase,
} from "../../../src/application/purchases/purchase-service";

export type PurchaseActionState = {
  ok: boolean;
  message: string;
  purchaseId?: string;
};

function normalizeDigits(value: string): string {
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  const ar = "٠١٢٣٤٥٦٧٨٩";
  return value
    .replace(/[۰-۹]/g, (digit) => String(fa.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(ar.indexOf(digit)))
    .replace(/[,_،\s]/g, "");
}

function positiveBigInt(value: FormDataEntryValue | null, label: string): bigint {
  const normalized = normalizeDigits(String(value ?? ""));
  if (!/^\d+$/.test(normalized)) throw new Error(`${label} باید عدد صحیح باشد.`);
  const result = BigInt(normalized);
  if (result <= 0n) throw new Error(`${label} باید بیشتر از صفر باشد.`);
  return result;
}

function nonNegativeBigInt(value: FormDataEntryValue | null): bigint {
  const normalized = normalizeDigits(String(value ?? "0"));
  if (!/^\d+$/.test(normalized)) throw new Error("مبلغ نامعتبر است.");
  return BigInt(normalized);
}

function parseDate(value: FormDataEntryValue | null): Date {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) throw new Error("تاریخ معتبر نیست.");
  return date;
}

export async function createPurchaseAction(
  _state: PurchaseActionState,
  formData: FormData,
): Promise<PurchaseActionState> {
  try {
    const current = await requireCurrentWorkspace();
    if (current.role === "VIEWER") return { ok: false, message: "نقش مشاهده‌گر اجازه ثبت خرید ندارد." };

    const purchase = await createPurchaseDraft({
      workspaceId: current.workspace.id,
      actorId: current.userId,
      supplierId: String(formData.get("supplierId") ?? "").trim(),
      warehouseId: String(formData.get("warehouseId") ?? "").trim(),
      invoiceNumber: String(formData.get("invoiceNumber") ?? "").trim(),
      issuedAt: parseJalaliDate(String(formData.get("issuedAt") ?? "")),
      dueAt: parseJalaliDate(String(formData.get("dueAt") ?? "")),
      lines: [{
        itemId: String(formData.get("itemId") ?? "").trim(),
        quantityMinorUnits: positiveBigInt(formData.get("quantity"), "تعداد"),
        unitPrice: positiveBigInt(formData.get("unitPrice"), "قیمت واحد"),
        discount: nonNegativeBigInt(formData.get("discount")),
        tax: nonNegativeBigInt(formData.get("tax")),
      }],
    });

    revalidatePath("/app/purchases");
    return { ok: true, message: "پیش‌نویس خرید با موفقیت ثبت شد.", purchaseId: purchase.id };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "ثبت خرید ناموفق بود." };
  }
}

async function workflowAction(
  purchaseId: string,
  operation: "submit" | "approve" | "post",
): Promise<PurchaseActionState> {
  try {
    const current = await requireCurrentWorkspace();
    if (current.role === "VIEWER") return { ok: false, message: "نقش مشاهده‌گر اجازه تغییر خرید ندارد." };

    if (operation === "submit") await submitPurchase(purchaseId, current.workspace.id, current.userId);
    if (operation === "approve") await approvePurchase(purchaseId, current.workspace.id, current.userId);
    if (operation === "post") await postPurchase(purchaseId, current.workspace.id, current.userId);

    revalidatePath("/app/purchases");
    revalidatePath("/app/inventory");
    revalidatePath("/app");
    revalidatePath("/app/reports/financial");

    return { ok: true, message: "وضعیت خرید با موفقیت به‌روزرسانی شد.", purchaseId };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "عملیات خرید ناموفق بود." };
  }
}

export async function submitPurchaseAction(purchaseId: string) {
  return workflowAction(purchaseId, "submit");
}

export async function approvePurchaseAction(purchaseId: string) {
  return workflowAction(purchaseId, "approve");
}

export async function postPurchaseAction(purchaseId: string) {
  return workflowAction(purchaseId, "post");
}
