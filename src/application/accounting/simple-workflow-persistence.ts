import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/prisma";
import { assertWorkspaceWriteEntitlement } from "../subscription/workspace-entitlement";

export type SimplePersistedAction = "sale" | "purchase" | "receipt" | "payment" | "expense";

export interface ExecuteSimpleWorkflowInput {
  action: SimplePersistedAction;
  workspaceId: string;
  actorId: string;
  amountRials: bigint;
  occurredAt: Date;
  counterpartyId?: string;
  openBalanceId?: string;
  dueAt?: Date;
  description?: string;
  idempotencyKey: string;
}

const ACCOUNT_CODES = {
  cash: "1101",
  receivable: "1201",
  payable: "2101",
  revenue: "4101",
  expense: "5201",
} as const;

export function assertFinancialWriteEnvironment(env: NodeJS.ProcessEnv = process.env): void {
  if (env.FINANCIAL_WRITES_ENABLED !== "true") {
    throw new Error("FINANCIAL_WRITES_DISABLED");
  }
  const productionLike = env.NODE_ENV === "production" || env.VERCEL_ENV === "production";
  if (productionLike && env.FINANCIAL_WRITES_PRODUCTION_APPROVED !== "true") {
    throw new Error("PRODUCTION_FINANCIAL_WRITES_NOT_APPROVED");
  }
}

function requirePositiveAmount(amount: bigint): void {
  if (amount <= 0n) throw new Error("AMOUNT_MUST_BE_POSITIVE");
}

function nextOpenBalanceState(outstanding: bigint): "OPEN" | "PARTIALLY_PAID" | "PAID" {
  if (outstanding === 0n) return "PAID";
  return "PARTIALLY_PAID";
}

export async function listSimpleWorkflowOptions(workspaceId: string, action: SimplePersistedAction) {
  if (action === "sale" || action === "purchase") {
    const counterparties = await prisma.counterparty.findMany({
      where: {
        workspaceId,
        active: true,
        type: action === "sale" ? { in: ["CUSTOMER", "BOTH"] } : { in: ["SUPPLIER", "BOTH"] },
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true },
    });
    return { counterparties, openBalances: [] };
  }

  if (action === "receipt" || action === "payment") {
    const openBalances = await prisma.openBalance.findMany({
      where: {
        workspaceId,
        type: action === "receipt" ? "RECEIVABLE" : "PAYABLE",
        status: { in: ["OPEN", "PARTIALLY_PAID"] },
      },
      include: { counterparty: { select: { name: true } } },
      orderBy: [{ dueAt: "asc" }, { issuedAt: "asc" }],
    });
    return {
      counterparties: [],
      openBalances: openBalances.map((balance) => ({
        id: balance.id,
        counterpartyName: balance.counterparty.name,
        outstandingAmount: balance.outstandingAmount.toString(),
        dueAt: balance.dueAt.toISOString(),
      })),
    };
  }

  return { counterparties: [], openBalances: [] };
}

export async function executeSimpleWorkflow(input: ExecuteSimpleWorkflowInput) {
  assertFinancialWriteEnvironment();
  await assertWorkspaceWriteEntitlement(input.workspaceId);
  requirePositiveAmount(input.amountRials);
  if (!input.idempotencyKey.trim()) throw new Error("IDEMPOTENCY_KEY_REQUIRED");

  return prisma.$transaction(async (tx) => {
    const existingJournal = await tx.accountingJournal.findFirst({
      where: { workspaceId: input.workspaceId, idempotencyKey: input.idempotencyKey },
      include: { lines: true },
    });
    if (existingJournal) return { journal: existingJournal, idempotentReplay: true };

    const accountCodes = Object.values(ACCOUNT_CODES);
    const accounts = await tx.accountingAccount.findMany({
      where: { workspaceId: input.workspaceId, active: true, code: { in: accountCodes } },
      select: { id: true, code: true },
    });
    const byCode = new Map(accounts.map((account) => [account.code, account.id]));
    const accountId = (code: string) => {
      const id = byCode.get(code);
      if (!id) throw new Error(`ACCOUNT_NOT_CONFIGURED:${code}`);
      return id;
    };

    const period = await tx.fiscalPeriod.findFirst({
      where: {
        workspaceId: input.workspaceId,
        status: "OPEN",
        startsAt: { lte: input.occurredAt },
        endsAt: { gte: input.occurredAt },
      },
      orderBy: { startsAt: "desc" },
    });
    if (!period) throw new Error("OPEN_FISCAL_PERIOD_REQUIRED");

    const sourceId = `simple:${input.action}:${randomUUID()}`;
    const zero = 0n;
    let description = input.description?.trim() || "ثبت ساده تسوین";
    let lines: Array<{ accountId: string; debit: bigint; credit: bigint }> = [];

    if (input.action === "sale" || input.action === "purchase") {
      if (!input.counterpartyId) throw new Error("COUNTERPARTY_REQUIRED");
      const counterparty = await tx.counterparty.findFirst({
        where: { id: input.counterpartyId, workspaceId: input.workspaceId, active: true },
      });
      if (!counterparty) throw new Error("INVALID_COUNTERPARTY");
      if (input.action === "sale" && counterparty.type === "SUPPLIER") throw new Error("CUSTOMER_REQUIRED");
      if (input.action === "purchase" && counterparty.type === "CUSTOMER") throw new Error("SUPPLIER_REQUIRED");

      const dueAt = input.dueAt ?? input.occurredAt;
      if (dueAt < input.occurredAt) throw new Error("INVALID_DUE_DATE");
      const type = input.action === "sale" ? "RECEIVABLE" : "PAYABLE";
      description = input.description?.trim() || (input.action === "sale" ? `فروش به ${counterparty.name}` : `خرید از ${counterparty.name}`);

      await tx.openBalance.create({
        data: {
          workspaceId: input.workspaceId,
          counterpartyId: counterparty.id,
          type,
          sourceDocumentId: sourceId,
          issuedAt: input.occurredAt,
          dueAt,
          originalAmount: input.amountRials,
          outstandingAmount: input.amountRials,
          currency: "IRR",
          status: "OPEN",
        },
      });

      lines = input.action === "sale"
        ? [
            { accountId: accountId(ACCOUNT_CODES.receivable), debit: input.amountRials, credit: zero },
            { accountId: accountId(ACCOUNT_CODES.revenue), debit: zero, credit: input.amountRials },
          ]
        : [
            { accountId: accountId(ACCOUNT_CODES.expense), debit: input.amountRials, credit: zero },
            { accountId: accountId(ACCOUNT_CODES.payable), debit: zero, credit: input.amountRials },
          ];
    } else if (input.action === "receipt" || input.action === "payment") {
      if (!input.openBalanceId) throw new Error("OPEN_BALANCE_REQUIRED");
      const expectedType = input.action === "receipt" ? "RECEIVABLE" : "PAYABLE";
      const balance = await tx.openBalance.findFirst({
        where: {
          id: input.openBalanceId,
          workspaceId: input.workspaceId,
          type: expectedType,
          status: { in: ["OPEN", "PARTIALLY_PAID"] },
        },
        include: { counterparty: true },
      });
      if (!balance) throw new Error("OPEN_BALANCE_NOT_FOUND");
      if (input.amountRials > balance.outstandingAmount) throw new Error("AMOUNT_EXCEEDS_OUTSTANDING_BALANCE");

      const remaining = balance.outstandingAmount - input.amountRials;
      await tx.openBalance.update({
        where: { id: balance.id },
        data: { outstandingAmount: remaining, status: nextOpenBalanceState(remaining) },
      });
      description = input.description?.trim() || (input.action === "receipt" ? `دریافت از ${balance.counterparty.name}` : `پرداخت به ${balance.counterparty.name}`);
      lines = input.action === "receipt"
        ? [
            { accountId: accountId(ACCOUNT_CODES.cash), debit: input.amountRials, credit: zero },
            { accountId: accountId(ACCOUNT_CODES.receivable), debit: zero, credit: input.amountRials },
          ]
        : [
            { accountId: accountId(ACCOUNT_CODES.payable), debit: input.amountRials, credit: zero },
            { accountId: accountId(ACCOUNT_CODES.cash), debit: zero, credit: input.amountRials },
          ];
    } else {
      description = input.description?.trim() || "ثبت هزینه";
      lines = [
        { accountId: accountId(ACCOUNT_CODES.expense), debit: input.amountRials, credit: zero },
        { accountId: accountId(ACCOUNT_CODES.cash), debit: zero, credit: input.amountRials },
      ];
    }

    const debitTotal = lines.reduce((sum, line) => sum + line.debit, 0n);
    const creditTotal = lines.reduce((sum, line) => sum + line.credit, 0n);
    if (debitTotal !== creditTotal) throw new Error("UNBALANCED_JOURNAL");

    const journal = await tx.accountingJournal.create({
      data: {
        workspaceId: input.workspaceId,
        fiscalPeriodId: period.id,
        occurredAt: input.occurredAt,
        description,
        status: "POSTED",
        sourceDocumentId: sourceId,
        idempotencyKey: input.idempotencyKey,
        postedAt: new Date(),
        lines: { create: lines },
      },
      include: { lines: true },
    });

    return { journal, idempotentReplay: false };
  });
}
