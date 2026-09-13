import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { assertFinancialWriteEnvironment } from "../accounting/simple-workflow-persistence";
import { nextSettlementStatus } from "../../domain/settlements/settlement";
import { assertWorkspaceWriteEntitlement } from "../subscription/workspace-entitlement";
import { recordAuditEventInTransaction } from "../audit/audit-service";

const ACCOUNT_CODES = {
  cash: "1101",
  bank: "1102",
  receivable: "1201",
  payable: "2101",
} as const;

export type SettlementDirection = "RECEIPT" | "PAYMENT";
export type TreasuryAccountCode = "1101" | "1102";

export async function listSettlementOptions(workspaceId: string) {
  const [balances, treasuryAccounts] = await Promise.all([
    prisma.openBalance.findMany({
      where: {
        workspaceId,
        status: { in: ["OPEN", "PARTIALLY_PAID"] },
      },
      include: {
        counterparty: { select: { name: true } },
      },
      orderBy: [{ dueAt: "asc" }, { issuedAt: "asc" }],
      take: 200,
    }),
    prisma.accountingAccount.findMany({
      where: {
        workspaceId,
        active: true,
        code: { in: [ACCOUNT_CODES.cash, ACCOUNT_CODES.bank] },
      },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true },
    }),
  ]);

  return {
    receivables: balances
      .filter((balance) => balance.type === "RECEIVABLE")
      .map((balance) => ({
        id: balance.id,
        counterpartyName: balance.counterparty.name,
        outstandingAmount: balance.outstandingAmount,
        dueAt: balance.dueAt,
        sourceDocumentId: balance.sourceDocumentId,
      })),
    payables: balances
      .filter((balance) => balance.type === "PAYABLE")
      .map((balance) => ({
        id: balance.id,
        counterpartyName: balance.counterparty.name,
        outstandingAmount: balance.outstandingAmount,
        dueAt: balance.dueAt,
        sourceDocumentId: balance.sourceDocumentId,
      })),
    treasuryAccounts,
  };
}

export type SettlementInput = {
  workspaceId: string;
  actorId: string;
  direction: SettlementDirection;
  openBalanceId: string;
  treasuryAccountCode: TreasuryAccountCode;
  amountRials: bigint;
  occurredAt: Date;
  idempotencyKey: string;
  description?: string;
};

export async function executeSettlementInTransaction(
  tx: Prisma.TransactionClient,
  input: SettlementInput,
) {
  if (!input.idempotencyKey.trim()) {
    throw new Error("IDEMPOTENCY_KEY_REQUIRED");
  }
    const existingJournal = await tx.accountingJournal.findFirst({
      where: {
        workspaceId: input.workspaceId,
        idempotencyKey: input.idempotencyKey,
      },
      include: { lines: true },
    });

    if (existingJournal) {
      return {
        journal: existingJournal,
        idempotentReplay: true,
      };
    }

    const expectedType =
      input.direction === "RECEIPT" ? "RECEIVABLE" : "PAYABLE";

    const balance = await tx.openBalance.findFirst({
      where: {
        id: input.openBalanceId,
        workspaceId: input.workspaceId,
        type: expectedType,
        status: { in: ["OPEN", "PARTIALLY_PAID"] },
      },
      include: {
        counterparty: { select: { name: true } },
      },
    });

    if (!balance) throw new Error("OPEN_BALANCE_NOT_FOUND");

    const next = nextSettlementStatus(
      balance.outstandingAmount,
      input.amountRials,
    );

    const period = await tx.fiscalPeriod.findFirst({
      where: {
        workspaceId: input.workspaceId,
        status: "OPEN",
        startsAt: { lte: input.occurredAt },
        endsAt: { gte: input.occurredAt },
      },
      select: { id: true },
    });

    if (!period) throw new Error("OPEN_FISCAL_PERIOD_REQUIRED");

    const requiredCodes = [
      input.treasuryAccountCode,
      input.direction === "RECEIPT"
        ? ACCOUNT_CODES.receivable
        : ACCOUNT_CODES.payable,
    ];

    const accounts = await tx.accountingAccount.findMany({
      where: {
        workspaceId: input.workspaceId,
        active: true,
        code: { in: requiredCodes },
      },
      select: { id: true, code: true },
    });

    const byCode = new Map(accounts.map((account) => [account.code, account.id]));

    for (const code of requiredCodes) {
      if (!byCode.has(code)) {
        throw new Error(`ACCOUNT_NOT_CONFIGURED:${code}`);
      }
    }

    const balanceMutation = await tx.openBalance.updateMany({
      where: {
        id: balance.id,
        workspaceId: input.workspaceId,
        type: expectedType,
        status: balance.status,
        outstandingAmount: balance.outstandingAmount,
      },
      data: {
        outstandingAmount: next.outstandingAfter,
        status: next.status,
      },
    });

    if (balanceMutation.count !== 1) {
      throw new Error("OPEN_BALANCE_CONCURRENTLY_MODIFIED");
    }

    const description =
      input.description?.trim() ||
      (input.direction === "RECEIPT"
        ? `دریافت از ${balance.counterparty.name}`
        : `پرداخت به ${balance.counterparty.name}`);

    const treasuryAccountId = byCode.get(input.treasuryAccountCode)!;
    const controlAccountId = byCode.get(
      input.direction === "RECEIPT"
        ? ACCOUNT_CODES.receivable
        : ACCOUNT_CODES.payable,
    )!;

    const lines =
      input.direction === "RECEIPT"
        ? [
            {
              accountId: treasuryAccountId,
              debit: input.amountRials,
              credit: 0n,
            },
            {
              accountId: controlAccountId,
              debit: 0n,
              credit: input.amountRials,
            },
          ]
        : [
            {
              accountId: controlAccountId,
              debit: input.amountRials,
              credit: 0n,
            },
            {
              accountId: treasuryAccountId,
              debit: 0n,
              credit: input.amountRials,
            },
          ];

    const debitTotal = lines.reduce((sum, line) => sum + line.debit, 0n);
    const creditTotal = lines.reduce((sum, line) => sum + line.credit, 0n);

    if (debitTotal !== creditTotal) {
      throw new Error("UNBALANCED_SETTLEMENT_JOURNAL");
    }

    const journal = await tx.accountingJournal.create({
      data: {
        workspaceId: input.workspaceId,
        fiscalPeriodId: period.id,
        occurredAt: input.occurredAt,
        description,
        status: "POSTED",
        sourceDocumentId: balance.sourceDocumentId,
        idempotencyKey: input.idempotencyKey,
        postedAt: new Date(),
        lines: { create: lines },
      },
      include: { lines: true },
    });

    if (next.status === "PAID") {
      if (balance.type === "RECEIVABLE") {
        await tx.salesInvoice.updateMany({
          where: {
            id: balance.sourceDocumentId,
            workspaceId: input.workspaceId,
            status: "POSTED",
          },
          data: { status: "PAID" },
        });
      } else {
        await tx.purchaseInvoice.updateMany({
          where: {
            id: balance.sourceDocumentId,
            workspaceId: input.workspaceId,
            status: "POSTED",
          },
          data: { status: "PAID" },
        });
      }
    }

    await recordAuditEventInTransaction(tx, {
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      action: input.direction === "RECEIPT" ? "SETTLEMENT_RECEIPT_POSTED" : "SETTLEMENT_PAYMENT_POSTED",
      category: "SETTLEMENT",
      severity: "INFO",
      entityType: "OpenBalance",
      entityId: balance.id,
      requestId: input.idempotencyKey,
      before: {
        status: balance.status,
        outstandingAmount: balance.outstandingAmount,
      },
      after: {
        status: next.status,
        outstandingAmount: next.outstandingAfter,
      },
      metadata: {
        journalId: journal.id,
        amountRials: input.amountRials,
        treasuryAccountCode: input.treasuryAccountCode,
        sourceDocumentId: balance.sourceDocumentId,
      },
    });

    return {
      journal,
      idempotentReplay: false,
      outstandingAfter: next.outstandingAfter,
      status: next.status,
    };
}

export async function executeSettlement(input: SettlementInput) {
  assertFinancialWriteEnvironment();
  await assertWorkspaceWriteEntitlement(input.workspaceId);
  return prisma.$transaction((tx) => executeSettlementInTransaction(tx, input));
}
