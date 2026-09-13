import { prisma } from "../../../../../src/lib/prisma";
import { withAuthorizedApi } from "../../../../../src/application/api-platform/api-request-guard";

export async function GET(request: Request) {
  return withAuthorizedApi(request, "reports:read", async (auth) => {
    const [receivables, payables] = await Promise.all([
      prisma.openBalance.aggregate({
        where: {
          workspaceId: auth.workspaceId,
          type: "RECEIVABLE",
          status: { in: ["OPEN", "PARTIALLY_PAID"] },
        },
        _sum: { outstandingAmount: true },
      }),
      prisma.openBalance.aggregate({
        where: {
          workspaceId: auth.workspaceId,
          type: "PAYABLE",
          status: { in: ["OPEN", "PARTIALLY_PAID"] },
        },
        _sum: { outstandingAmount: true },
      }),
    ]);

    return Response.json({
      data: {
        receivables: receivables._sum?.outstandingAmount?.toString() ?? "0",
        payables: payables._sum?.outstandingAmount?.toString() ?? "0",
      },
      meta: { version: "v1" },
    });
  });
}
