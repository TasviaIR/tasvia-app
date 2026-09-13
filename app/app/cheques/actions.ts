"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentWorkspace } from "../../../src/auth/current-workspace";
import { parseJalaliDate } from "../../../src/lib/tasvin-date";
import {
  createCheque,
  updateChequeStatus,
} from "../../../src/application/cheques/cheque-service";

export type ChequeActionState = { ok: boolean; message: string };

function money(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").replace(/[,_،\s]/g, "");
  if (!/^\d+$/.test(normalized) || BigInt(normalized) <= 0n) {
    throw new Error("مبلغ چک معتبر نیست.");
  }
  return BigInt(normalized);
}

export async function createChequeAction(
  _: ChequeActionState,
  formData: FormData,
): Promise<ChequeActionState> {
  try {
    const current = await requireCurrentWorkspace();
    if (current.role === "VIEWER") {
      return { ok: false, message: "اجازه ثبت چک ندارید." };
    }

    const issuedAt = parseJalaliDate(String(formData.get("issuedAt") ?? ""));
    const dueAt = parseJalaliDate(String(formData.get("dueAt") ?? ""));

    await createCheque({
      workspaceId: current.workspace.id,
      actorId: current.userId,
      counterpartyId: String(formData.get("counterpartyId") ?? ""),
      direction: String(formData.get("direction")) as "RECEIVED" | "ISSUED",
      chequeNumber: String(formData.get("chequeNumber") ?? ""),
      sayadId: String(formData.get("sayadId") ?? "") || undefined,
      bankName: String(formData.get("bankName") ?? "") || undefined,
      amount: money(formData.get("amount")),
      issuedAt,
      dueAt,
      openBalanceId: String(formData.get("openBalanceId") ?? "") || undefined,
    });

    revalidatePath("/app/cheques");
    return { ok: true, message: "چک ثبت شد." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "ثبت چک ناموفق بود.",
    };
  }
}

export async function changeChequeStatusAction(
  chequeId: string,
  nextStatus: "DUE" | "CLEARED" | "BOUNCED" | "CANCELLED",
): Promise<void> {
  const current = await requireCurrentWorkspace();
  if (current.role === "VIEWER") return;

  await updateChequeStatus({
    workspaceId: current.workspace.id,
    actorId: current.userId,
    chequeId,
    nextStatus,
  });

  revalidatePath("/app/cheques");
}
