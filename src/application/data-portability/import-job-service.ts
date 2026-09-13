import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { recordAuditEventInTransaction } from "../audit/audit-service";

export type CreateImportJobInput = {
  workspaceId: string;
  actorId: string;
  actorRole?: string;
  entityType: string;
  filename: string;
  sourceContent: string;
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  errorReport?: unknown;
};

export async function createDryRunImportJob(input: CreateImportJobInput) {
  if (input.totalRows < 0 || input.acceptedRows < 0 || input.rejectedRows < 0) {
    throw new Error("IMPORT_COUNTS_INVALID");
  }

  if (input.acceptedRows + input.rejectedRows !== input.totalRows) {
    throw new Error("IMPORT_COUNTS_MISMATCH");
  }

  const sourceHash = createHash("sha256")
    .update(input.sourceContent)
    .digest("hex");

  return prisma.$transaction(async (tx) => {
    const job = await tx.dataImportJob.create({
      data: {
        workspaceId: input.workspaceId,
        actorId: input.actorId,
        entityType: input.entityType,
        filename: input.filename,
        sourceHash,
        mode: "DRY_RUN",
        status: input.rejectedRows > 0 ? "VALIDATED_WITH_ERRORS" : "VALIDATED",
        totalRows: input.totalRows,
        acceptedRows: input.acceptedRows,
        rejectedRows: input.rejectedRows,
        errorReport: input.errorReport as Prisma.InputJsonValue | undefined,
      },
    });

    await recordAuditEventInTransaction(tx, {
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: "DATA_IMPORT_DRY_RUN",
      category: "DATA_PORTABILITY",
      entityType: "DataImportJob",
      entityId: job.id,
      after: {
        entityType: input.entityType,
        filename: input.filename,
        sourceHash,
        totalRows: input.totalRows,
        acceptedRows: input.acceptedRows,
        rejectedRows: input.rejectedRows,
        status: job.status,
      },
    });

    return job;
  });
}

export async function markImportJobCommitted(input: {
  workspaceId: string;
  actorId: string;
  actorRole?: string;
  jobId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const job = await tx.dataImportJob.findFirst({
      where: {
        id: input.jobId,
        workspaceId: input.workspaceId,
      },
    });

    if (!job) throw new Error("IMPORT_JOB_NOT_FOUND");
    if (job.rejectedRows > 0) throw new Error("IMPORT_JOB_HAS_ERRORS");
    if (job.status === "COMMITTED") throw new Error("IMPORT_ALREADY_COMMITTED");

    const updated = await tx.dataImportJob.update({
      where: { id: job.id },
      data: {
        mode: "COMMIT",
        status: "COMMITTED",
        committedAt: new Date(),
      },
    });

    await recordAuditEventInTransaction(tx, {
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: "DATA_IMPORT_COMMIT",
      category: "DATA_PORTABILITY",
      entityType: "DataImportJob",
      entityId: job.id,
      before: { status: job.status },
      after: { status: updated.status },
    });

    return updated;
  });
}
