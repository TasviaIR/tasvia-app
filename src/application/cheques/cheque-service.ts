import { prisma } from "../../lib/prisma";
import {
  transitionCheque,
  type ChequeStatus,
} from "../../domain/accounting/cheque";
import { assertFinancialWriteEnvironment } from "../accounting/simple-workflow-persistence";
import { assertWorkspaceWriteEntitlement } from "../subscription/workspace-entitlement";
import {
  executeSettlementInTransaction,
  type TreasuryAccountCode,
} from "../settlements/settlement-service";
import { recordAuditEventInTransaction } from "../audit/audit-service";

export async function listChequeOptions(workspaceId: string) {
  const [counterparties, balances] = await Promise.all([
    prisma.counterparty.findMany({
      where: { workspaceId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true },
    }),
    prisma.openBalance.findMany({
      where: {
        workspaceId,
        status: { in: ["OPEN", "PARTIALLY_PAID"] },
      },
      include: { counterparty: { select: { name: true } } },
      orderBy: [{ dueAt: "asc" }],
    }),
  ]);

  return { counterparties, balances };
}

export function listCheques(workspaceId: string) {
  return prisma.chequeRecord.findMany({
    where: { workspaceId },
    include: { counterparty: { select: { name: true } } },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    take: 200,
  });
}

export async function createCheque(input: {
  workspaceId: string;
  actorId: string;
  counterpartyId: string;
  direction: "RECEIVED" | "ISSUED";
  chequeNumber: string;
  sayadId?: string;
  bankName?: string;
  amount: bigint;
  issuedAt: Date;
  dueAt: Date;
  openBalanceId?: string;
}) {
  assertFinancialWriteEnvironment();
  await assertWorkspaceWriteEntitlement(input.workspaceId);

  if (!input.chequeNumber.trim()) throw new Error("CHEQUE_NUMBER_REQUIRED");
  if (input.amount <= 0n) throw new Error("CHEQUE_AMOUNT_INVALID");
  if (input.dueAt < input.issuedAt) throw new Error("CHEQUE_DUE_DATE_INVALID");

  return prisma.$transaction(async (tx) => {
    const counterparty = await tx.counterparty.findFirst({
      where: {
        id: input.counterpartyId,
        workspaceId: input.workspaceId,
        active: true,
      },
    });
    if (!counterparty) throw new Error("INVALID_COUNTERPARTY");

    if (input.openBalanceId) {
      const expected =
        input.direction === "RECEIVED" ? "RECEIVABLE" : "PAYABLE";
      const balance = await tx.openBalance.findFirst({
        where: {
          id: input.openBalanceId,
          workspaceId: input.workspaceId,
          counterpartyId: input.counterpartyId,
          type: expected,
          status: { in: ["OPEN", "PARTIALLY_PAID"] },
        },
      });
      if (!balance) throw new Error("INVALID_CHEQUE_BALANCE");
      if (input.amount > balance.outstandingAmount) {
        throw new Error("CHEQUE_EXCEEDS_OUTSTANDING");
      }
    }

    const created = await tx.chequeRecord.create({
      data: {
        workspaceId: input.workspaceId,
        counterpartyId: input.counterpartyId,
        direction: input.direction,
        chequeNumber: input.chequeNumber.trim(),
        sayadId: input.sayadId?.trim() || null,
        bankName: input.bankName?.trim() || null,
        amount: input.amount,
        issuedAt: input.issuedAt,
        dueAt: input.dueAt,
        openBalanceId: input.openBalanceId || null,
        createdBy: input.actorId,
      },
    });

    await recordAuditEventInTransaction(tx, {
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      action: "CHEQUE_CREATED",
      category: "CHEQUE",
      entityType: "ChequeRecord",
      entityId: created.id,
      after: {
        direction: created.direction,
        chequeNumber: created.chequeNumber,
        amount: created.amount,
        status: created.status,
        dueAt: created.dueAt,
      },
    });

    return created;
  });
}

export async function updateChequeStatus(input: {
  workspaceId: string;
  actorId: string;
  chequeId: string;
  nextStatus: ChequeStatus;
  treasuryAccountCode?: TreasuryAccountCode;
}) {
  assertFinancialWriteEnvironment();
  await assertWorkspaceWriteEntitlement(input.workspaceId);

  return prisma.$transaction(async (tx) => {
    const current = await tx.chequeRecord.findFirst({
      where: { id: input.chequeId, workspaceId: input.workspaceId },
    });
    if (!current) throw new Error("CHEQUE_NOT_FOUND");

    const transitioned = transitionCheque(
      {
        id: current.id,
        workspaceId: current.workspaceId,
        counterpartyId: current.counterpartyId,
        direction: current.direction,
        chequeNumber: current.chequeNumber,
        sayadId: current.sayadId ?? undefined,
        bankName: current.bankName ?? undefined,
        accountReference: current.accountReference ?? undefined,
        amount: { currency: "IRR", minorUnits: current.amount },
        issuedAt: current.issuedAt,
        dueAt: current.dueAt,
        status: current.status,
      },
      input.nextStatus,
    );

    if (input.nextStatus === "CLEARED" && current.openBalanceId) {
      if (current.clearedJournalId) {
        return current;
      }

      if (!input.treasuryAccountCode) {
        throw new Error("TREASURY_ACCOUNT_REQUIRED_FOR_CHEQUE_CLEARING");
      }

      const result = await executeSettlementInTransaction(tx, {
        workspaceId: input.workspaceId,
        actorId: input.actorId,
        direction: current.direction === "RECEIVED" ? "RECEIPT" : "PAYMENT",
        openBalanceId: current.openBalanceId,
        treasuryAccountCode: input.treasuryAccountCode,
        amountRials: current.amount,
        occurredAt: new Date(),
        idempotencyKey: `cheque-clear:${input.workspaceId}:${current.id}`,
        description:
          current.direction === "RECEIVED"
            ? `وصول چک ${current.chequeNumber}`
            : `پاس شدن چک ${current.chequeNumber}`,
      });

      const updated = await tx.chequeRecord.update({
        where: { id: current.id },
        data: {
          status: transitioned.status,
          treasuryAccountCode: input.treasuryAccountCode,
          clearedJournalId: result.journal.id,
          statusChangedBy: input.actorId,
          statusChangedAt: new Date(),
        },
      });

      await recordAuditEventInTransaction(tx, {
        workspaceId: input.workspaceId,
        actorId: input.actorId,
        action: "CHEQUE_STATUS_CHANGED",
        category: "CHEQUE",
        entityType: "ChequeRecord",
        entityId: current.id,
        before: { status: current.status },
        after: { status: updated.status },
        metadata: {
          clearedJournalId: result.journal.id,
          treasuryAccountCode: input.treasuryAccountCode,
        },
      });

      return updated;
    }

    const updated = await tx.chequeRecord.update({
      where: { id: current.id },
      data: {
        status: transitioned.status,
        statusChangedBy: input.actorId,
        statusChangedAt: new Date(),
      },
    });

    await recordAuditEventInTransaction(tx, {
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      action: "CHEQUE_STATUS_CHANGED",
      category: "CHEQUE",
      severity: updated.status === "BOUNCED" ? "WARNING" : "INFO",
      entityType: "ChequeRecord",
      entityId: current.id,
      before: { status: current.status },
      after: { status: updated.status },
    });

    return updated;
  });
}
