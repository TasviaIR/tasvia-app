import type { AccountingDimensionType } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { assertWorkspaceWriteEntitlement } from "../subscription/workspace-entitlement";

const DIMENSION_TYPES = new Set<AccountingDimensionType>([
  "BRANCH",
  "COST_CENTER",
  "PROJECT",
]);

function normalizeCode(value: string): string {
  const code = value.trim().toUpperCase();
  if (code.length < 1 || code.length > 40) {
    throw new Error("DIMENSION_CODE_INVALID");
  }
  if (!/^[A-Z0-9_-]+$/.test(code)) {
    throw new Error("DIMENSION_CODE_INVALID");
  }
  return code;
}

function normalizeName(value: string): string {
  const name = value.trim();
  if (name.length < 2 || name.length > 120) {
    throw new Error("DIMENSION_NAME_INVALID");
  }
  return name;
}

function assertDimensionType(type: AccountingDimensionType): void {
  if (!DIMENSION_TYPES.has(type)) {
    throw new Error("DIMENSION_TYPE_INVALID");
  }
}

export async function listDimensionValues(workspaceId: string) {
  return prisma.accountingDimensionValue.findMany({
    where: { workspaceId },
    orderBy: [{ type: "asc" }, { active: "desc" }, { code: "asc" }],
  });
}

export async function createDimensionValue(input: {
  workspaceId: string;
  type: AccountingDimensionType;
  code: string;
  name: string;
}) {
  await assertWorkspaceWriteEntitlement(input.workspaceId);
  assertDimensionType(input.type);

  return prisma.accountingDimensionValue.create({
    data: {
      workspaceId: input.workspaceId,
      type: input.type,
      code: normalizeCode(input.code),
      name: normalizeName(input.name),
    },
  });
}

export async function setDimensionValueActive(input: {
  workspaceId: string;
  id: string;
  active: boolean;
}) {
  await assertWorkspaceWriteEntitlement(input.workspaceId);

  const result = await prisma.accountingDimensionValue.updateMany({
    where: {
      id: input.id,
      workspaceId: input.workspaceId,
    },
    data: {
      active: input.active,
    },
  });

  if (result.count !== 1) {
    throw new Error("DIMENSION_NOT_FOUND");
  }
}
