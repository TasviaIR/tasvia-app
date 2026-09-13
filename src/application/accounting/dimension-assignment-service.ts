import type { AccountingDimensionType } from "@prisma/client";
import {
  projectAmountByDimension,
  validateDimensionAssignment,
  type AccountingDimensionValue as DomainDimensionValue,
} from "../../domain/accounting/dimensions";
import { prisma } from "../../lib/prisma";
import { assertWorkspaceWriteEntitlement } from "../subscription/workspace-entitlement";

export type DimensionAllocationInput = {
  dimensionValueId: string;
  basisPoints: number;
};

export async function setJournalLineDimensionAssignment(input: {
  workspaceId: string;
  journalLineId: string;
  type: AccountingDimensionType;
  allocations: DimensionAllocationInput[];
}) {
  await assertWorkspaceWriteEntitlement(input.workspaceId);

  const line = await prisma.accountingJournalLine.findFirst({
    where: {
      id: input.journalLineId,
      journal: { workspaceId: input.workspaceId },
    },
    include: {
      journal: {
        select: {
          workspaceId: true,
          status: true,
        },
      },
    },
  });

  if (!line) {
    throw new Error("DIMENSION_JOURNAL_LINE_NOT_FOUND");
  }

  if (line.journal.status !== "DRAFT") {
    throw new Error("DIMENSION_POSTED_JOURNAL_LOCKED");
  }

  const valueIds = input.allocations.map((item) => item.dimensionValueId);
  const values = await prisma.accountingDimensionValue.findMany({
    where: {
      id: { in: valueIds },
    },
  });

  validateDimensionAssignment({
    workspaceId: input.workspaceId,
    assignment: {
      dimensionType: input.type,
      allocations: input.allocations,
    },
    values: values.map(
      (value): DomainDimensionValue => ({
        id: value.id,
        workspaceId: value.workspaceId,
        type: value.type,
        code: value.code,
        name: value.name,
        active: value.active,
      }),
    ),
  });

  return prisma.$transaction(async (tx) => {
    await tx.accountingDimensionAssignment.deleteMany({
      where: {
        workspaceId: input.workspaceId,
        journalLineId: input.journalLineId,
        type: input.type,
      },
    });

    return tx.accountingDimensionAssignment.create({
      data: {
        workspaceId: input.workspaceId,
        journalLineId: input.journalLineId,
        type: input.type,
        allocations: {
          create: input.allocations.map((allocation) => ({
            dimensionValueId: allocation.dimensionValueId,
            basisPoints: allocation.basisPoints,
          })),
        },
      },
      include: {
        allocations: {
          include: {
            dimensionValue: true,
          },
        },
      },
    });
  });
}

export async function listDimensionAssignmentWorkspace(workspaceId: string) {
  const [values, lines] = await Promise.all([
    prisma.accountingDimensionValue.findMany({
      where: { workspaceId },
      orderBy: [{ type: "asc" }, { active: "desc" }, { code: "asc" }],
    }),
    prisma.accountingJournalLine.findMany({
      where: {
        journal: {
          workspaceId,
          status: "DRAFT",
        },
      },
      include: {
        account: {
          select: { code: true, name: true },
        },
        journal: {
          select: {
            number: true,
            description: true,
            occurredAt: true,
            status: true,
          },
        },
        dimensionAssignments: {
          include: {
            allocations: {
              include: {
                dimensionValue: true,
              },
            },
          },
        },
      },
      orderBy: {
        journal: {
          occurredAt: "desc",
        },
      },
      take: 50,
    }),
  ]);

  return { values, lines };
}

export async function buildDimensionReportSummary(
  workspaceId: string,
  type: AccountingDimensionType,
) {
  const allocations = await prisma.accountingDimensionAllocation.findMany({
    where: {
      assignment: {
        workspaceId,
        type,
        journalLine: {
          journal: {
            workspaceId,
            status: "POSTED",
          },
        },
      },
    },
    include: {
      dimensionValue: true,
      assignment: {
        include: {
          journalLine: true,
        },
      },
    },
  });

  const totals = new Map<
    string,
    {
      id: string;
      code: string;
      name: string;
      debit: bigint;
      credit: bigint;
    }
  >();

  for (const allocation of allocations) {
    const line = allocation.assignment.journalLine;
    const current = totals.get(allocation.dimensionValueId) ?? {
      id: allocation.dimensionValue.id,
      code: allocation.dimensionValue.code,
      name: allocation.dimensionValue.name,
      debit: 0n,
      credit: 0n,
    };

    const assignment = {
      dimensionType: type,
      allocations: [
        {
          dimensionValueId: allocation.dimensionValueId,
          basisPoints: allocation.basisPoints,
        },
      ],
    };

    current.debit += projectAmountByDimension({
      amountMinorUnits: line.debit,
      assignment,
      dimensionValueId: allocation.dimensionValueId,
    });

    current.credit += projectAmountByDimension({
      amountMinorUnits: line.credit,
      assignment,
      dimensionValueId: allocation.dimensionValueId,
    });

    totals.set(allocation.dimensionValueId, current);
  }

  return [...totals.values()].sort((a, b) => a.code.localeCompare(b.code));
}
