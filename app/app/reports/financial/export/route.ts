import type { AccountingDimensionType } from "@prisma/client";
import { headers } from "next/headers";
import { auth, authConfigured } from "../../../../../src/lib/auth";
import { prisma } from "../../../../../src/lib/prisma";
import { buildProfessionalFinancialReport, professionalReportToCsv } from "../../../../../src/application/accounting/professional-financial-report";

function parseDate(value: string | null, end = false) {
  if (!value) return undefined;
  const date = new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
function parseDimensionType(value: string | null): AccountingDimensionType | undefined {
  return value === "BRANCH" || value === "COST_CENTER" || value === "PROJECT" ? value : undefined;
}

export async function GET(request: Request) {
  if (!authConfigured) return new Response("AUTH_NOT_CONFIGURED", { status: 503 });
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return new Response("UNAUTHORIZED", { status: 401 });
  const membership = await prisma.membership.findFirst({ where: { userId: session.user.id, status: "ACTIVE" }, select: { workspaceId: true } });
  if (!membership) return new Response("WORKSPACE_ACCESS_REQUIRED", { status: 403 });

  const url = new URL(request.url);
  const report = await buildProfessionalFinancialReport(membership.workspaceId, {
    from: parseDate(url.searchParams.get("from")),
    to: parseDate(url.searchParams.get("to"), true),
    dimensionType: parseDimensionType(url.searchParams.get("dimensionType")),
    dimensionValueId: url.searchParams.get("dimensionValueId") || undefined,
  });

  return new Response(professionalReportToCsv(report), {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="tasvin-financial-report.csv"',
      "cache-control": "private, no-store",
    },
  });
}
