"use server";

import { parseJalaliDate } from "../../../src/lib/tasvin-date";
import { revalidatePath } from "next/cache";
import { requireCurrentWorkspace } from "../../../src/auth/current-workspace";
import {
  approveSale,
  createSalesDraft,
  postSale,
  submitSale,
} from "../../../src/application/sales/sales-service";

export type SalesActionState = {
  ok: boolean;
  message: string;
  saleId?: string;
};

function positiveBigInt(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").replace(/[,_،\s]/g, "");
  if (!/^\d+$/.test(normalized) || BigInt(normalized) <= 0n) {
    throw new Error("عدد نامعتبر است.");
  }
  return BigInt(normalized);
}

function nonNegativeBigInt(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "0").replace(/[,_،\s]/g, "");
  if (!/^\d+$/.test(normalized)) {
    throw new Error("مبلغ نامعتبر است.");
  }
  return BigInt(normalized);
}

export async function createSaleAction(
  _: SalesActionState,
  formData: FormData,
): Promise<SalesActionState> {
  try {
    const context = await requireCurrentWorkspace();
    if (context.role === "VIEWER") {
      return { ok: false, message: "اجازه ثبت فروش ندارید." };
    }

    const issuedAt = parseJalaliDate(String(formData.get("issuedAt") ?? ""));
    const dueAt = parseJalaliDate(String(formData.get("dueAt") ?? ""));

    if (
      Number.isNaN(issuedAt.getTime()) ||
      Number.isNaN(dueAt.getTime())
    ) {
      return { ok: false, message: "تاریخ معتبر نیست." };
    }

    const sale = await createSalesDraft({
      workspaceId: context.workspace.id,
      actorId: context.userId,
      customerId: String(formData.get("customerId") ?? ""),
      warehouseId: String(formData.get("warehouseId") ?? ""),
      invoiceNumber: String(formData.get("invoiceNumber") ?? ""),
      issuedAt,
      dueAt,
      lines: [
        {
          itemId: String(formData.get("itemId") ?? ""),
          quantityMinorUnits: positiveBigInt(formData.get("quantity")),
          unitPrice: positiveBigInt(formData.get("unitPrice")),
          discount: nonNegativeBigInt(formData.get("discount")),
          tax: nonNegativeBigInt(formData.get("tax")),
        },
      ],
    });

    revalidatePath("/app/sales");

    return {
      ok: true,
      message: "پیش‌نویس فروش ثبت شد.",
      saleId: sale.id,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "خطا در ثبت فروش.",
    };
  }
}

async function runSaleOperation(
  id: string,
  operation: "submit" | "approve" | "post",
): Promise<SalesActionState> {
  try {
    const context = await requireCurrentWorkspace();

    if (context.role === "VIEWER") {
      return { ok: false, message: "اجازه تغییر فروش ندارید." };
    }

    if (operation === "submit") {
      await submitSale(id, context.workspace.id, context.userId);
    } else if (operation === "approve") {
      await approveSale(id, context.workspace.id, context.userId);
    } else {
      await postSale(id, context.workspace.id, context.userId);
    }

    revalidatePath("/app/sales");
    revalidatePath("/app/inventory");
    revalidatePath("/app/reports/financial");

    return { ok: true, message: "عملیات فروش انجام شد." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "خطا در عملیات فروش.",
    };
  }
}

export async function submitSaleAction(
  id: string,
): Promise<SalesActionState> {
  return runSaleOperation(id, "submit");
}

export async function approveSaleAction(
  id: string,
): Promise<SalesActionState> {
  return runSaleOperation(id, "approve");
}

export async function postSaleAction(
  id: string,
): Promise<SalesActionState> {
  return runSaleOperation(id, "post");
}
