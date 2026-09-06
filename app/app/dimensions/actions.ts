"use server";

import type { AccountingDimensionType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireCurrentWorkspace } from "../../../src/auth/current-workspace";
import { prisma } from "../../../src/lib/prisma";
import {
  createDimensionValue,
  setDimensionValueActive,
} from "../../../src/application/accounting/dimension-service";
import { recordAuditEvent } from "../../../src/application/audit/audit-service";

function assertCanManage(role: string) {
  if (role === "VIEWER") throw new Error("DIMENSION_PERMISSION_DENIED");
}

export async function createDimensionAction(formData: FormData): Promise<void> {
  const current = await requireCurrentWorkspace();
  assertCanManage(current.role);

  const type = String(formData.get("type") ?? "") as AccountingDimensionType;
  const code = String(formData.get("code") ?? "");
  const name = String(formData.get("name") ?? "");

  const created = await createDimensionValue({
    workspaceId: current.workspace.id,
    type,
    code,
    name,
  });

  await recordAuditEvent({
    workspaceId: current.workspace.id,
    actorId: current.userId,
    actorRole: current.role,
    action: "DIMENSION_VALUE_CREATED",
    category: "DIMENSION",
    entityType: "AccountingDimensionValue",
    entityId: created.id,
    after: {
      type: created.type,
      code: created.code,
      name: created.name,
      active: created.active,
    },
  });

  revalidatePath("/app/dimensions");
}

export async function setDimensionActiveAction(formData: FormData): Promise<void> {
  const current = await requireCurrentWorkspace();
  assertCanManage(current.role);

  const id = String(formData.get("id") ?? "").trim();
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) throw new Error("DIMENSION_NOT_FOUND");

  const before = await prisma.accountingDimensionValue.findFirst({
    where: { id, workspaceId: current.workspace.id },
  });
  if (!before) throw new Error("DIMENSION_NOT_FOUND");

  await setDimensionValueActive({
    workspaceId: current.workspace.id,
    id,
    active,
  });

  await recordAuditEvent({
    workspaceId: current.workspace.id,
    actorId: current.userId,
    actorRole: current.role,
    action: active ? "DIMENSION_VALUE_ACTIVATED" : "DIMENSION_VALUE_DEACTIVATED",
    category: "DIMENSION",
    entityType: "AccountingDimensionValue",
    entityId: id,
    before: { active: before.active },
    after: { active },
  });

  revalidatePath("/app/dimensions");
}
