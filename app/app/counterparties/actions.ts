"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../../src/lib/prisma";
import { requireCurrentWorkspace } from "../../../src/auth/current-workspace";

const value = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim() || null;

export async function createCounterpartyAction(fd: FormData) {
  const current = await requireCurrentWorkspace();
  if (current.role === "VIEWER") throw new Error("COUNTERPARTY_WRITE_FORBIDDEN");

  const rawType = String(fd.get("type") ?? "");
  if (rawType !== "CUSTOMER" && rawType !== "SUPPLIER") throw new Error("INVALID_COUNTERPARTY_TYPE");

  const name = value(fd, "name");
  if (!name) throw new Error("COUNTERPARTY_NAME_REQUIRED");

  await prisma.counterparty.create({
    data: {
      workspaceId: current.workspace.id,
      type: rawType,
      name,
      phone: value(fd, "phone"),
      email: value(fd, "email"),
      nationalId: value(fd, "nationalId"),
      economicCode: value(fd, "economicCode"),
    },
  });

  revalidatePath(rawType === "CUSTOMER" ? "/app/customers" : "/app/suppliers");
}
