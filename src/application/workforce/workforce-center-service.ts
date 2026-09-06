import { prisma } from "../../lib/prisma";

export function payrollNet(gross: bigint, deductions: bigint) {
  if (gross <= 0n) throw new Error("PAYROLL_GROSS_INVALID");
  if (deductions < 0n || deductions > gross) throw new Error("PAYROLL_DEDUCTIONS_INVALID");
  return gross - deductions;
}

export function monthlyStraightLine(acquisitionCost: bigint, residualValue: bigint, usefulLifeMonths: number) {
  if (acquisitionCost <= 0n) throw new Error("ASSET_COST_INVALID");
  if (residualValue < 0n || residualValue > acquisitionCost) throw new Error("ASSET_RESIDUAL_INVALID");
  if (!Number.isInteger(usefulLifeMonths) || usefulLifeMonths <= 0) throw new Error("ASSET_LIFE_INVALID");
  return (acquisitionCost - residualValue) / BigInt(usefulLifeMonths);
}

export async function getPayrollCenter(workspaceId: string) {
  const [employees, runs] = await Promise.all([
    prisma.employee.findMany({ where: { workspaceId }, orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.payrollRun.findMany({
      where: { workspaceId },
      include: { lines: { include: { employee: true } } },
      orderBy: { periodEnd: "desc" },
      take: 12,
    }),
  ]);
  return { employees, runs };
}

export async function getFixedAssetCenter(workspaceId: string) {
  const assets = await prisma.fixedAsset.findMany({
    where: { workspaceId },
    include: { depreciationEntries: true },
    orderBy: { acquisitionDate: "desc" },
  });

  return assets.map((asset) => {
    const accumulated = asset.depreciationEntries.reduce((sum, row) => sum + row.amount, 0n);
    const carrying = asset.acquisitionCost - accumulated;
    return {
      ...asset,
      accumulated,
      carrying: carrying < asset.residualValue ? asset.residualValue : carrying,
      monthlyDepreciation: monthlyStraightLine(asset.acquisitionCost, asset.residualValue, asset.usefulLifeMonths),
    };
  });
}
