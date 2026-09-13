import { prisma } from "../../lib/prisma";
import { assertFinancialWriteEnvironment } from "./simple-workflow-persistence";
import { assertWorkspaceWriteEntitlement } from "../subscription/workspace-entitlement";
import { recordAuditEventInTransaction } from "../audit/audit-service";

export async function listFiscalPeriods(workspaceId: string) {
  return prisma.fiscalPeriod.findMany({
    where: { workspaceId },
    orderBy: { startsAt: "desc" },
  });
}

export async function fiscalCloseReadiness(
  workspaceId: string,
  fiscalPeriodId: string,
) {
  const period = await prisma.fiscalPeriod.findFirst({
    where: { id: fiscalPeriodId, workspaceId },
  });
  if (!period) throw new Error("FISCAL_PERIOD_NOT_FOUND");

  const [draftJournals, openReceivables, openPayables] = await Promise.all([
    prisma.accountingJournal.count({
      where: {
        workspaceId,
        fiscalPeriodId,
        status: "DRAFT",
      },
    }),
    prisma.openBalance.count({
      where: {
        workspaceId,
        type: "RECEIVABLE",
        status: { in: ["OPEN", "PARTIALLY_PAID"] },
        issuedAt: { lte: period.endsAt },
      },
    }),
    prisma.openBalance.count({
      where: {
        workspaceId,
        type: "PAYABLE",
        status: { in: ["OPEN", "PARTIALLY_PAID"] },
        issuedAt: { lte: period.endsAt },
      },
    }),
  ]);

  return {
    period,
    blockers: {
      draftJournals,
    },
    warnings: {
      openReceivables,
      openPayables,
    },
    canClose: draftJournals === 0 && period.status === "OPEN",
  };
}

export async function closeFiscalPeriod(input: {
  workspaceId: string;
  actorId: string;
  fiscalPeriodId: string;
}) {
  assertFinancialWriteEnvironment();
  await assertWorkspaceWriteEntitlement(input.workspaceId);

  return prisma.$transaction(async (tx) => {
    const period = await tx.fiscalPeriod.findFirst({
      where: {
        id: input.fiscalPeriodId,
        workspaceId: input.workspaceId,
      },
    });
    if (!period) throw new Error("FISCAL_PERIOD_NOT_FOUND");
    if (period.status === "CLOSED") return period;

    const drafts = await tx.accountingJournal.count({
      where: {
        workspaceId: input.workspaceId,
        fiscalPeriodId: period.id,
        status: "DRAFT",
      },
    });

    if (drafts > 0) throw new Error("FISCAL_CLOSE_DRAFT_JOURNALS");

    const updated = await tx.fiscalPeriod.update({
      where: { id: period.id },
      data: { status: "CLOSED" },
    });

    await recordAuditEventInTransaction(tx, {
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      action: "FISCAL_PERIOD_CLOSED",
      category: "FISCAL_CONTROL",
      severity: "WARNING",
      entityType: "FiscalPeriod",
      entityId: period.id,
      before: { status: period.status },
      after: { status: updated.status },
    });

    return updated;
  });
}

export async function reopenFiscalPeriod(input: {
  workspaceId: string;
  actorId: string;
  fiscalPeriodId: string;
  reason: string;
}) {
  assertFinancialWriteEnvironment();
  await assertWorkspaceWriteEntitlement(input.workspaceId);

  const reason = input.reason.trim();
  if (reason.length < 10) throw new Error("FISCAL_REOPEN_REASON_REQUIRED");

  return prisma.$transaction(async (tx) => {
    const period = await tx.fiscalPeriod.findFirst({
      where: {
        id: input.fiscalPeriodId,
        workspaceId: input.workspaceId,
      },
    });

    if (!period) throw new Error("FISCAL_PERIOD_NOT_FOUND");
    if (period.status === "OPEN") return period;

    const reopenedAt = new Date();

    const updated = await tx.fiscalPeriod.update({
      where: { id: period.id },
      data: { status: "OPEN" },
    });

    await tx.fiscalReopenAudit.create({
      data: {
        workspaceId: input.workspaceId,
        fiscalPeriodId: period.id,
        actorId: input.actorId,
        reason,
        beforeStatus: period.status,
        afterStatus: updated.status,
        occurredAt: reopenedAt,
      },
    });

    await recordAuditEventInTransaction(tx, {
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      action: "FISCAL_PERIOD_REOPENED",
      category: "FISCAL_CONTROL",
      severity: "CRITICAL",
      entityType: "FiscalPeriod",
      entityId: period.id,
      reason,
      before: { status: period.status },
      after: { status: updated.status },
    });

    return updated;
  });
}

export async function reversePostedJournal(input: {
  workspaceId: string;
  actorId: string;
  journalId: string;
  reason: string;
  occurredAt: Date;
}) {
  assertFinancialWriteEnvironment();
  await assertWorkspaceWriteEntitlement(input.workspaceId);

  const reason = input.reason.trim();
  if (reason.length < 10) throw new Error("REVERSAL_REASON_REQUIRED");

  return prisma.$transaction(async (tx) => {
    const original = await tx.accountingJournal.findFirst({
      where: {
        id: input.journalId,
        workspaceId: input.workspaceId,
        status: "POSTED",
      },
      include: { lines: true },
    });

    if (!original) throw new Error("POSTED_JOURNAL_NOT_FOUND");

    const existing = await tx.accountingJournal.findFirst({
      where: {
        workspaceId: input.workspaceId,
        reversalOfId: original.id,
      },
    });
    if (existing) return existing;

    const period = await tx.fiscalPeriod.findFirst({
      where: {
        workspaceId: input.workspaceId,
        status: "OPEN",
        startsAt: { lte: input.occurredAt },
        endsAt: { gte: input.occurredAt },
      },
    });
    if (!period) throw new Error("OPEN_FISCAL_PERIOD_REQUIRED");

    const reversal = await tx.accountingJournal.create({
      data: {
        workspaceId: input.workspaceId,
        fiscalPeriodId: period.id,
        occurredAt: input.occurredAt,
        description: `برگشت سند: ${reason}`,
        status: "POSTED",
        sourceDocumentId: original.sourceDocumentId,
        reversalOfId: original.id,
        idempotencyKey: `reversal:${input.workspaceId}:${original.id}`,
        postedAt: new Date(),
        lines: {
          create: original.lines.map((line) => ({
            accountId: line.accountId,
            debit: line.credit,
            credit: line.debit,
            description: `برگشت: ${reason}`,
          })),
        },
      },
    });

    await tx.accountingJournal.update({
      where: { id: original.id },
      data: {
        status: "REVERSED",
        reversedAt: new Date(),
      },
    });

    await recordAuditEventInTransaction(tx, {
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      action: "ACCOUNTING_JOURNAL_REVERSED",
      category: "ACCOUNTING",
      severity: "CRITICAL",
      entityType: "AccountingJournal",
      entityId: original.id,
      reason,
      before: { status: original.status },
      after: { status: "REVERSED" },
      metadata: { reversalJournalId: reversal.id },
    });

    return reversal;
  });
}
export async function listFiscalReopenAudits(
  workspaceId: string,
  fiscalPeriodId: string,
) {
  return prisma.fiscalReopenAudit.findMany({
    where: { workspaceId, fiscalPeriodId },
    orderBy: { occurredAt: "desc" },
    take: 100,
  });
}
