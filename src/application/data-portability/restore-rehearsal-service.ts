import { prisma } from "../../lib/prisma";
import { recordAuditEventInTransaction } from "../audit/audit-service";

export async function recordRestoreRehearsal(input: {
  workspaceId: string;
  actorId: string;
  actorRole?: string;
  backupChecksum: string;
  schemaVersion: string;
  rowCountMatch: boolean;
  checksumMatch: boolean;
  schemaValid: boolean;
  notes?: string;
}) {
  const passed =
    input.rowCountMatch &&
    input.checksumMatch &&
    input.schemaValid;

  return prisma.$transaction(async (tx) => {
    const evidence = await tx.restoreRehearsalEvidence.create({
      data: {
        workspaceId: input.workspaceId,
        actorId: input.actorId,
        backupChecksum: input.backupChecksum,
        schemaVersion: input.schemaVersion,
        rowCountMatch: input.rowCountMatch,
        checksumMatch: input.checksumMatch,
        schemaValid: input.schemaValid,
        passed,
        notes: input.notes,
      },
    });

    await recordAuditEventInTransaction(tx, {
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: "RESTORE_REHEARSAL_RECORDED",
      category: "PRODUCTION_READINESS",
      severity: passed ? "INFO" : "WARNING",
      entityType: "RestoreRehearsalEvidence",
      entityId: evidence.id,
      after: {
        passed,
        rowCountMatch: input.rowCountMatch,
        checksumMatch: input.checksumMatch,
        schemaValid: input.schemaValid,
        schemaVersion: input.schemaVersion,
      },
    });

    return evidence;
  });
}

export async function hasPassingRestoreRehearsal(
  workspaceId: string,
): Promise<boolean> {
  const evidence = await prisma.restoreRehearsalEvidence.findFirst({
    where: {
      workspaceId,
      passed: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
    },
  });

  return Boolean(evidence);
}
