import { prisma } from "../../lib/prisma";

export type CenterKind = "CUSTOMER" | "SUPPLIER";

export async function getCounterpartyCenter(workspaceId: string, kind: CenterKind) {
  const customer = kind === "CUSTOMER";
  const types = customer ? ["CUSTOMER", "BOTH"] : ["SUPPLIER", "BOTH"];
  const balanceType = customer ? "RECEIVABLE" : "PAYABLE";

  const parties = await prisma.counterparty.findMany({
    where: { workspaceId, type: { in: types as ("CUSTOMER" | "SUPPLIER" | "BOTH")[] } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: {
      id: true, name: true, phone: true, email: true,
      nationalId: true, economicCode: true, active: true,
    },
  });

  const ids = parties.map((p) => p.id);
  const [balances, sales, purchases, cheques] = await Promise.all([
    prisma.openBalance.findMany({
      where: { workspaceId, type: balanceType, counterpartyId: { in: ids } },
      select: {
        counterpartyId: true, outstandingAmount: true, dueAt: true, status: true,
      },
    }),
    customer
      ? prisma.salesInvoice.findMany({
          where: { workspaceId, customerId: { in: ids } },
          orderBy: { issuedAt: "desc" },
          select: {
            customerId: true, invoiceNumber: true, issuedAt: true,
            total: true, status: true,
          },
          take: 500,
        })
      : Promise.resolve([]),
    customer
      ? Promise.resolve([])
      : prisma.purchaseInvoice.findMany({
          where: { workspaceId, supplierId: { in: ids } },
          orderBy: { issuedAt: "desc" },
          select: {
            supplierId: true, invoiceNumber: true, issuedAt: true,
            total: true, status: true,
          },
          take: 500,
        }),
    prisma.chequeRecord.findMany({
      where: { workspaceId, counterpartyId: { in: ids } },
      select: { counterpartyId: true, status: true },
    }),
  ]);

  const now = new Date();
  const week = new Date(now.getTime() + 7 * 86400000);

  const rows = parties.map((party) => {
    const open = balances.filter(
      (b) => b.counterpartyId === party.id &&
        (b.status === "OPEN" || b.status === "PARTIALLY_PAID"),
    );
    const docs = customer
      ? sales.filter((d) => d.customerId === party.id)
      : purchases.filter((d) => d.supplierId === party.id);

    const outstanding = open.reduce((n, b) => n + b.outstandingAmount, 0n);
    const overdue = open
      .filter((b) => b.dueAt < now)
      .reduce((n, b) => n + b.outstandingAmount, 0n);
    const nextDue = open.map((b) => b.dueAt).sort((a,b)=>a.getTime()-b.getTime())[0] ?? null;

    return {
      ...party,
      outstanding,
      overdue,
      nextDue,
      dueSoon: open.filter((b) => b.dueAt >= now && b.dueAt <= week).length,
      lastDocument: docs[0] ?? null,
      dueCheques: cheques.filter(
        (c) => c.counterpartyId === party.id &&
          (c.status === "REGISTERED" || c.status === "DUE"),
      ).length,
    };
  });

  return {
    rows,
    metrics: {
      active: rows.filter((r) => r.active).length,
      outstanding: rows.reduce((n,r)=>n+r.outstanding,0n),
      overdue: rows.reduce((n,r)=>n+r.overdue,0n),
      dueSoon: rows.reduce((n,r)=>n+r.dueSoon,0),
    },
  };
}
