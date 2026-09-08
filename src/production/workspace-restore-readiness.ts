import { prisma } from "../lib/prisma";

export type WorkspaceRestoreReadiness = {
  workspaceId: string;
  hasPassingRestoreRehearsal: boolean;
  latestRehearsalAt: Date | null;
  latestPassedAt: Date | null;
};

export async function resolveWorkspaceRestoreReadiness(
  workspaceId: string,
): Promise<WorkspaceRestoreReadiness> {
  const [latest, latestPassing] = await Promise.all([
    prisma.restoreRehearsalEvidence.findFirst({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
      },
    }),
    prisma.restoreRehearsalEvidence.findFirst({
      where: {
        workspaceId,
        passed: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        createdAt: true,
      },
    }),
  ]);

  return {
    workspaceId,
    hasPassingRestoreRehearsal: Boolean(latestPassing),
    latestRehearsalAt: latest?.createdAt ?? null,
    latestPassedAt: latestPassing?.createdAt ?? null,
  };
}
