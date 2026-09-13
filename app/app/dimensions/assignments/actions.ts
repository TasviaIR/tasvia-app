"use server";

import type { AccountingDimensionType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireCurrentWorkspace } from "../../../../src/auth/current-workspace";
import { setJournalLineDimensionAssignment } from "../../../../src/application/accounting/dimension-assignment-service";
import { recordAuditEvent } from "../../../../src/application/audit/audit-service";

function assertCanManage(role: string) {
  if (role === "VIEWER") {
    throw new Error("DIMENSION_PERMISSION_DENIED");
  }
}

function parsePercentToBasisPoints(value: string): number {
  const normalized = value.trim();
  const match = /^(\d{1,3})(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) throw new Error("DIMENSION_PERCENT_INVALID");

  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(2, "0") || "0");
  const basisPoints = whole * 100 + fraction;

  if (basisPoints <= 0 || basisPoints > 10_000) {
    throw new Error("DIMENSION_PERCENT_INVALID");
  }

  return basisPoints;
}

export async function setDimensionAssignmentAction(formData: FormData): Promise<void> {
  const current = await requireCurrentWorkspace();
  assertCanManage(current.role);

  const journalLineId = String(formData.get("journalLineId") ?? "").trim();
  const type = String(formData.get("type") ?? "") as AccountingDimensionType;

  const allocations = [1, 2, 3]
    .map((slot) => {
      const dimensionValueId = String(
        formData.get(`dimensionValueId${slot}`) ?? "",
      ).trim();
      const percent = String(formData.get(`percent${slot}`) ?? "").trim();

      if (!dimensionValueId && !percent) return null;
      if (!dimensionValueId || !percent) {
        throw new Error("DIMENSION_ALLOCATION_INCOMPLETE");
      }

      return {
        dimensionValueId,
        basisPoints: parsePercentToBasisPoints(percent),
      };
    })
    .filter(
      (
        item,
      ): item is {
        dimensionValueId: string;
        basisPoints: number;
      } => Boolean(item),
    );

  if (!journalLineId) throw new Error("DIMENSION_JOURNAL_LINE_NOT_FOUND");

  await setJournalLineDimensionAssignment({
    workspaceId: current.workspace.id,
    journalLineId,
    type,
    allocations,
  });

  await recordAuditEvent({
    workspaceId: current.workspace.id,
    actorId: current.userId,
    actorRole: current.role,
    action: "DIMENSION_ASSIGNMENT_SET",
    category: "DIMENSION",
    entityType: "AccountingJournalLine",
    entityId: journalLineId,
    metadata: { type, allocations },
  });

  revalidatePath("/app/dimensions/assignments");
}
