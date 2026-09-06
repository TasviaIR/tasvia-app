"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, authConfigured } from "../../src/lib/auth";
import { prisma } from "../../src/lib/prisma";
import { provisionWorkspaceTrial } from "../../src/application/subscription/workspace-entitlement";

function normalizeWorkspaceName(value: FormDataEntryValue | null): string {
  const name = String(value ?? "").trim();
  if (name.length < 2 || name.length > 120) {
    throw new Error("WORKSPACE_NAME_INVALID");
  }
  return name;
}

export async function createTrialWorkspaceAction(formData: FormData): Promise<void> {
  if (!authConfigured) {
    redirect("/sign-in?next=/onboarding");
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    redirect("/sign-in?next=/onboarding");
  }

  const name = normalizeWorkspaceName(formData.get("name"));
  const startedAt = new Date();
  const slug = `ws-${randomUUID().replaceAll("-", "").slice(0, 16)}`;

  await prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: {
        name,
        slug,
        memberships: {
          create: {
            userId: session.user.id,
            role: "OWNER",
            status: "ACTIVE",
          },
        },
      },
    });

    await provisionWorkspaceTrial(tx, workspace.id, startedAt);
  });

  redirect("/app/subscription");
}
