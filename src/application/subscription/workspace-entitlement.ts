import type { Prisma } from "@prisma/client";
import { entitlement, trialEndsAt } from "../../domain/subscription/plans";
import { prisma } from "../../lib/prisma";

export type WorkspaceEntitlement = {
  canRead: boolean;
  canWrite: boolean;
  reason: "ACTIVE" | "TRIAL" | "SUBSCRIPTION_REQUIRED";
};

type SubscriptionSnapshot = {
  status: string;
  trialEndsAt: Date;
} | null;

export function evaluateWorkspaceEntitlement(
  subscription: SubscriptionSnapshot,
  now = new Date(),
): WorkspaceEntitlement {
  if (!subscription) {
    return {
      canRead: true,
      canWrite: false,
      reason: "SUBSCRIPTION_REQUIRED",
    };
  }

  return entitlement(
    subscription.status,
    subscription.trialEndsAt,
    now,
  ) as WorkspaceEntitlement;
}

export async function getWorkspaceEntitlement(
  workspaceId: string,
  now = new Date(),
): Promise<WorkspaceEntitlement> {
  const subscription = await prisma.workspaceSubscription.findUnique({
    where: { workspaceId },
    select: { status: true, trialEndsAt: true },
  });

  return evaluateWorkspaceEntitlement(subscription, now);
}

export async function assertWorkspaceWriteEntitlement(
  workspaceId: string,
  now = new Date(),
): Promise<void> {
  const state = await getWorkspaceEntitlement(workspaceId, now);
  if (!state.canWrite) {
    throw new Error(`WORKSPACE_READ_ONLY:${state.reason}`);
  }
}

export async function provisionWorkspaceTrial(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  startedAt = new Date(),
) {
  return tx.workspaceSubscription.create({
    data: {
      workspaceId,
      planCode: "AGHAZ",
      status: "TRIALING",
      trialStartedAt: startedAt,
      trialEndsAt: trialEndsAt(startedAt),
    },
  });
}
