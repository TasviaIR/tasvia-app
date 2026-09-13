"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentWorkspace } from "../../../src/auth/current-workspace";
import { parseJalaliDate } from "../../../src/lib/tasvin-date";
import {
  createBankEvidence,
  decideEvidence,
} from "../../../src/application/reconciliation/reconciliation-service";

export async function createEvidenceAction(formData: FormData): Promise<void> {
  const current = await requireCurrentWorkspace();
  if (current.role === "VIEWER") return;

  const amount = BigInt(String(formData.get("amount") ?? "0").replace(/[,_،\s]/g, ""));
  const occurredAt = parseJalaliDate(String(formData.get("occurredAt") ?? ""));

  await createBankEvidence({
    workspaceId: current.workspace.id,
    actorId: current.userId,
    accountCode: String(formData.get("accountCode")) as "1101" | "1102",
    externalRef: String(formData.get("externalRef") ?? ""),
    amount,
    direction: String(formData.get("direction")) as "IN" | "OUT",
    occurredAt,
    description: String(formData.get("description") ?? "") || undefined,
  });

  revalidatePath("/app/reconciliation");
}

export async function matchEvidenceAction(
  evidenceId: string,
  journalLineId: string,
): Promise<void> {
  const current = await requireCurrentWorkspace();
  if (current.role === "VIEWER") return;

  await decideEvidence({
    workspaceId: current.workspace.id,
    actorId: current.userId,
    evidenceId,
    journalLineId,
    decision: "MATCHED",
  });

  revalidatePath("/app/reconciliation");
}
