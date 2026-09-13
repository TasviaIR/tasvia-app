import { withAuthorizedApi } from "../../../../src/application/api-platform/api-request-guard";
import { buildTreasuryProjection } from "../../../../src/application/accounting/treasury-projection";

export async function GET(request: Request) {
  return withAuthorizedApi(request, "treasury:read", async (auth) => {
    const projection = await buildTreasuryProjection(auth.workspaceId);

    return Response.json({
      data: {
        accounts: projection.accounts.map((account) => ({
          ...account,
          balance: account.balance.toString(),
        })),
        recentMovements: projection.recentMovements.map((movement) => ({
          ...movement,
          amount: movement.amount.toString(),
          occurredAt: movement.occurredAt.toISOString(),
        })),
      },
      meta: { version: "v1" },
    });
  });
}
