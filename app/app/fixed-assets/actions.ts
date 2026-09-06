"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../../src/lib/prisma";
import { requireCurrentWorkspace } from "../../../src/auth/current-workspace";
import { monthlyStraightLine } from "../../../src/application/workforce/workforce-center-service";
import { recordAuditEvent } from "../../../src/application/audit/audit-service";

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const money = (fd: FormData, key: string) => {
  const raw = text(fd, key).replace(/[,\s]/g, "");
  if (!/^\d+$/.test(raw)) throw new Error(`INVALID_${key.toUpperCase()}`);
  return BigInt(raw);
};

export async function createFixedAssetAction(fd: FormData) {
  const c = await requireCurrentWorkspace();
  if (c.role === "VIEWER") throw new Error("ASSET_WRITE_FORBIDDEN");

  const code = text(fd, "code");
  const name = text(fd, "name");
  const acquisitionCost = money(fd, "acquisitionCost");
  const residualValue = money(fd, "residualValue");
  const usefulLifeMonths = Number(text(fd, "usefulLifeMonths"));
  const acquisitionDate = new Date(text(fd, "acquisitionDate"));

  monthlyStraightLine(acquisitionCost, residualValue, usefulLifeMonths);
  if (!code || !name || !Number.isFinite(acquisitionDate.getTime())) throw new Error("ASSET_REQUIRED_FIELDS");

  const asset = await prisma.fixedAsset.create({
    data: {
      workspaceId: c.workspace.id,
      code,
      name,
      acquisitionDate,
      acquisitionCost,
      residualValue,
      usefulLifeMonths,
    },
  });

  await recordAuditEvent({
    workspaceId: c.workspace.id,
    actorId: c.userId,
    actorRole: c.role,
    action: "FIXED_ASSET_CREATED",
    category: "FIXED_ASSET",
    entityType: "FixedAsset",
    entityId: asset.id,
    after: {
      code: asset.code,
      name: asset.name,
      acquisitionCost: asset.acquisitionCost,
      residualValue: asset.residualValue,
      usefulLifeMonths: asset.usefulLifeMonths,
      status: asset.status,
    },
  });

  revalidatePath("/app/fixed-assets");
}

export async function postDepreciationAction(fd: FormData) {
  const c = await requireCurrentWorkspace();
  if (c.role === "VIEWER") throw new Error("ASSET_WRITE_FORBIDDEN");

  const assetId = text(fd, "assetId");
  const periodDate = new Date(text(fd, "periodDate"));

  const asset = await prisma.fixedAsset.findFirst({
    where: { id: assetId, workspaceId: c.workspace.id, status: "ACTIVE" },
    include: { depreciationEntries: true },
  });

  if (!asset || !Number.isFinite(periodDate.getTime())) throw new Error("ASSET_NOT_FOUND");

  const monthly = monthlyStraightLine(asset.acquisitionCost, asset.residualValue, asset.usefulLifeMonths);
  const accumulated = asset.depreciationEntries.reduce((sum, row) => sum + row.amount, 0n);
  const remaining = asset.acquisitionCost - asset.residualValue - accumulated;
  if (remaining <= 0n) throw new Error("ASSET_FULLY_DEPRECIATED");

  const depreciation = await prisma.assetDepreciation.create({
    data: {
      workspaceId: c.workspace.id,
      assetId,
      periodDate,
      amount: monthly > remaining ? remaining : monthly,
      note: "استهلاک ماهانه خط مستقیم",
    },
  });

  await recordAuditEvent({
    workspaceId: c.workspace.id,
    actorId: c.userId,
    actorRole: c.role,
    action: "ASSET_DEPRECIATION_POSTED",
    category: "FIXED_ASSET",
    severity: "WARNING",
    entityType: "AssetDepreciation",
    entityId: depreciation.id,
    metadata: {
      assetId,
      periodDate,
      amount: depreciation.amount,
    },
  });

  revalidatePath("/app/fixed-assets");
}
