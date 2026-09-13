import type { AccountingDimensionType } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export type FinancialReportFilters = {
  from?: Date;
  to?: Date;
  dimensionType?: AccountingDimensionType;
  dimensionValueId?: string;
};

export type TrialBalanceRow = {
  accountId: string;
  code: string;
  name: string;
  type: string;
  debit: bigint;
  credit: bigint;
  balance: bigint;
};

export type LedgerRow = {
  journalId: string;
  journalNumber: string | null;
  occurredAt: Date;
  description: string;
  sourceDocumentId: string | null;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: bigint;
  credit: bigint;
};

export type ProfessionalFinancialReport = {
  journal: LedgerRow[];
  trialBalance: TrialBalanceRow[];
  profitAndLoss: { revenue: bigint; expenses: bigint; netIncome: bigint };
  balanceSheet: { assets: bigint; liabilities: bigint; equity: bigint; retainedEarnings: bigint; liabilitiesAndEquity: bigint; difference: bigint };
  cashFlow: { cashIn: bigint; cashOut: bigint; netCashFlow: bigint };
};

function naturalBalance(type: string, debit: bigint, credit: bigint): bigint {
  return type === "ASSET" || type === "EXPENSE" ? debit - credit : credit - debit;
}

function allocate(amount: bigint, basisPoints: number): bigint {
  return (amount * BigInt(basisPoints)) / 10_000n;
}

export async function buildProfessionalFinancialReport(
  workspaceId: string,
  filters: FinancialReportFilters = {},
): Promise<ProfessionalFinancialReport> {
  if (filters.dimensionValueId && !filters.dimensionType) throw new Error("DIMENSION_TYPE_REQUIRED");

  if (filters.dimensionValueId && filters.dimensionType) {
    const dimension = await prisma.accountingDimensionValue.findFirst({
      where: { id: filters.dimensionValueId, workspaceId, type: filters.dimensionType, active: true },
      select: { id: true },
    });
    if (!dimension) throw new Error("DIMENSION_FILTER_INVALID");
  }

  const lines = await prisma.accountingJournalLine.findMany({
    where: {
      journal: {
        workspaceId,
        status: "POSTED",
        occurredAt: {
          ...(filters.from ? { gte: filters.from } : {}),
          ...(filters.to ? { lte: filters.to } : {}),
        },
      },
    },
    include: {
      account: { select: { id: true, code: true, name: true, type: true } },
      journal: { select: { id: true, number: true, occurredAt: true, description: true, sourceDocumentId: true } },
      dimensionAssignments: { include: { allocations: true } },
    },
    orderBy: [{ journal: { occurredAt: "asc" } }, { createdAt: "asc" }],
  });

  const journal: LedgerRow[] = [];
  const trial = new Map<string, TrialBalanceRow>();
  let revenue = 0n, expenses = 0n, assets = 0n, liabilities = 0n, equity = 0n, cashIn = 0n, cashOut = 0n;

  for (const line of lines) {
    let debit = line.debit;
    let credit = line.credit;

    if (filters.dimensionType && filters.dimensionValueId) {
      const assignment = line.dimensionAssignments.find((candidate) => candidate.type === filters.dimensionType);
      const allocation = assignment?.allocations.find((candidate) => candidate.dimensionValueId === filters.dimensionValueId);
      if (!allocation) continue;
      debit = allocate(debit, allocation.basisPoints);
      credit = allocate(credit, allocation.basisPoints);
    }

    journal.push({
      journalId: line.journal.id,
      journalNumber: line.journal.number,
      occurredAt: line.journal.occurredAt,
      description: line.description ?? line.journal.description,
      sourceDocumentId: line.journal.sourceDocumentId,
      accountId: line.account.id,
      accountCode: line.account.code,
      accountName: line.account.name,
      debit,
      credit,
    });

    const current = trial.get(line.account.id) ?? {
      accountId: line.account.id,
      code: line.account.code,
      name: line.account.name,
      type: line.account.type,
      debit: 0n,
      credit: 0n,
      balance: 0n,
    };
    current.debit += debit;
    current.credit += credit;
    current.balance = naturalBalance(current.type, current.debit, current.credit);
    trial.set(line.account.id, current);

    const balance = naturalBalance(line.account.type, debit, credit);
    if (line.account.type === "REVENUE") revenue += balance;
    if (line.account.type === "EXPENSE") expenses += balance;
    if (line.account.type === "ASSET") assets += balance;
    if (line.account.type === "LIABILITY") liabilities += balance;
    if (line.account.type === "EQUITY") equity += balance;
    if (line.account.code === "1101" || line.account.code === "1102") { cashIn += debit; cashOut += credit; }
  }

  const netIncome = revenue - expenses;
  const retainedEarnings = netIncome;
  const liabilitiesAndEquity = liabilities + equity + retainedEarnings;

  return {
    journal,
    trialBalance: [...trial.values()].sort((a,b) => a.code.localeCompare(b.code)),
    profitAndLoss: { revenue, expenses, netIncome },
    balanceSheet: { assets, liabilities, equity, retainedEarnings, liabilitiesAndEquity, difference: assets - liabilitiesAndEquity },
    cashFlow: { cashIn, cashOut, netCashFlow: cashIn - cashOut },
  };
}

export function professionalReportToCsv(report: ProfessionalFinancialReport): string {
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const rows = [
    ["journal_number","date","account_code","account_name","description","debit","credit"],
    ...report.journal.map((row) => [row.journalNumber ?? "", row.occurredAt.toISOString(), row.accountCode, row.accountName, row.description, row.debit.toString(), row.credit.toString()]),
  ];
  return "\uFEFF" + rows.map((row) => row.map(escape).join(",")).join("\n");
}
