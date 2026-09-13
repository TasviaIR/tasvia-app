import { prisma } from "../../../../src/lib/prisma";
import { withAuthorizedApi } from "../../../../src/application/api-platform/api-request-guard";

export async function GET(request: Request) {
  return withAuthorizedApi(request, "customers:read", async (auth) => {
    const data = await prisma.counterparty.findMany({
      where: {
        workspaceId: auth.workspaceId,
        type: { in: ["CUSTOMER", "BOTH"] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return Response.json({ data, meta: { version: "v1", limit: 100 } });
  });
}
