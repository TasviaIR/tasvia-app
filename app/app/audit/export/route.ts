import { headers } from "next/headers";
import { auth, authConfigured } from "../../../../src/lib/auth";
import { prisma } from "../../../../src/lib/prisma";
import {
  auditEventsToCsv,
  listAuditEvents,
} from "../../../../src/application/audit/audit-service";

function parseDate(value: string | null, endOfDay = false) {
  if (!value) return undefined;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function GET(request: Request) {
  if (!authConfigured) return new Response("AUTH_NOT_CONFIGURED", { status: 503 });

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return new Response("UNAUTHORIZED", { status: 401 });

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    select: { workspaceId: true },
  });

  if (!membership) return new Response("WORKSPACE_ACCESS_REQUIRED", { status: 403 });

  const url = new URL(request.url);
  const events = await listAuditEvents(membership.workspaceId, {
    actorId: url.searchParams.get("actorId") || undefined,
    action: url.searchParams.get("action") || undefined,
    category: url.searchParams.get("category") || undefined,
    severity: url.searchParams.get("severity") || undefined,
    entityType: url.searchParams.get("entityType") || undefined,
    entityId: url.searchParams.get("entityId") || undefined,
    from: parseDate(url.searchParams.get("from")),
    to: parseDate(url.searchParams.get("to"), true),
    take: 250,
  });

  return new Response(auditEventsToCsv(events), {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="tasvin-audit.csv"',
      "cache-control": "private, no-store",
    },
  });
}
