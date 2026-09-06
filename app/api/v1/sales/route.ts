import { prisma } from "../../../../src/lib/prisma";
import { withAuthorizedApi } from "../../../../src/application/api-platform/api-request-guard";

export async function GET(request: Request) {
  return withAuthorizedApi(request, "sales:read", async (auth) => {
    const data = await prisma.salesInvoice.findMany({
      where: { workspaceId: auth.workspaceId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return Response.json({ data, meta: { version: "v1", limit: 100 } });
  });
}
