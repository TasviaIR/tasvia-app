import { createHash } from "node:crypto";
import { prisma } from "../../lib/prisma";
import { recordAuditEventInTransaction } from "../audit/audit-service";
import type { CounterpartyImportRow } from "./counterparty-csv";

export async function commitCounterpartyImport(input: {
  workspaceId: string;
  actorId: string;
  actorRole?: string;
  jobId: string;
  sourceContent: string;
  rows: CounterpartyImportRow[];
}) {
  const sourceHash = createHash("sha256")
    .update(input.sourceContent)
    .digest("hex");

  return prisma.$transaction(async (tx) => {
    const job = await tx.dataImportJob.findFirst({
      where: {
        id: input.jobId,
        workspaceId: input.workspaceId,
      },
    });

    if (!job) throw new Error("IMPORT_JOB_NOT_FOUND");
    if (job.entityType !== "COUNTERPARTY") {
      throw new Error("IMPORT_ENTITY_TYPE_MISMATCH");
    }
    if (job.sourceHash !== sourceHash) {
      throw new Error("IMPORT_SOURCE_HASH_MISMATCH");
    }
    if (job.rejectedRows > 0) {
      throw new Error("IMPORT_JOB_HAS_ERRORS");
    }
    if (job.status === "COMMITTED") {
      throw new Error("IMPORT_ALREADY_COMMITTED");
    }
    if (job.acceptedRows !== input.rows.length) {
      throw new Error("IMPORT_ROW_COUNT_MISMATCH");
    }

    const created = [];

    for (const row of input.rows) {
      const counterparty = await tx.counterparty.create({
        data: {
          workspaceId: input.workspaceId,
          type: row.type,
          name: row.name,
          nationalId: row.nationalId,
          economicCode: row.economicCode,
          phone: row.phone,
          email: row.email,
        },
        select: {
          id: true,
          type: true,
          name: true,
        },
      });

      created.push(counterparty);
    }

    const updatedJob = await tx.dataImportJob.update({
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
      action: "COUNTERPARTY_IMPORT_COMMIT",
      category: "DATA_PORTABILITY",
      severity: "INFO",
      entityType: "DataImportJob",
      entityId: job.id,
      before: {
        status: job.status,
      },
      after: {
        status: updatedJob.status,
        createdCount: created.length,
        sourceHash,
      },
    });

    return {
      job: updatedJob,
      created,
    };
  });
}
