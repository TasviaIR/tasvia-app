"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentWorkspace } from "../../../src/auth/current-workspace";
import {
  archiveFinancialEvidence,
  registerFinancialEvidence,
} from "../../../src/application/evidence/financial-evidence-service";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function assertEvidenceManager(role: string) {
  if (role === "VIEWER") throw new Error("EVIDENCE_WRITE_FORBIDDEN");
}

export async function registerEvidenceAction(formData: FormData): Promise<void> {
  const current = await requireCurrentWorkspace();
  assertEvidenceManager(current.role);

  const byteSize = Number(text(formData, "byteSize"));

  await registerFinancialEvidence({
    workspaceId: current.workspace.id,
    actorId: current.userId,
    actorRole: current.role,
    category: text(formData, "category"),
    sourceEntityType: text(formData, "sourceEntityType"),
    sourceEntityId: text(formData, "sourceEntityId"),
    journalId: text(formData, "journalId") || undefined,
    safeFileName: text(formData, "safeFileName"),
    mimeType: text(formData, "mimeType"),
    byteSize,
    sha256: text(formData, "sha256"),
    storageKey: text(formData, "storageKey"),
    description: text(formData, "description") || undefined,
  });

  revalidatePath("/app/evidence");
}

export async function archiveEvidenceAction(formData: FormData): Promise<void> {
  const current = await requireCurrentWorkspace();
  assertEvidenceManager(current.role);

  await archiveFinancialEvidence({
    workspaceId: current.workspace.id,
    actorId: current.userId,
    actorRole: current.role,
    evidenceId: text(formData, "evidenceId"),
    reason: text(formData, "reason"),
  });

  revalidatePath("/app/evidence");
}
