import Link from "next/link";
import { WorkspaceShell } from "../../../src/components/workspace/shell";
import { requireCurrentWorkspace } from "../../../src/auth/current-workspace";
import { prisma } from "../../../src/lib/prisma";

export default async function CommercialControlsPage() {
  const current = await requireCurrentWorkspace();

  const [customers, suppliers, products, invoices, purchases, openBalances] =
    await Promise.all([
      prisma.counterparty.count({
        where: { workspaceId: current.workspace.id, type: { in: ["CUSTOMER", "BOTH"] }, active: true },
      }),
      prisma.counterparty.count({
        where: { workspaceId: current.workspace.id, type: { in: ["SUPPLIER", "BOTH"] }, active: true },
      }),
      prisma.catalogItem.count({
        where: { workspaceId: current.workspace.id, active: true },
      }),
      prisma.salesInvoice.count({
        where: { workspaceId: current.workspace.id },
      }),
      prisma.purchaseInvoice.count({
        where: { workspaceId: current.workspace.id },
      }),
      prisma.openBalance.count({
        where: { workspaceId: current.workspace.id, status: { in: ["OPEN", "PARTIALLY_PAID"] } },
      }),
    ]);

  const cards = [
    ["/app/customers", "مشتریان", `${customers} مشتری فعال`, "اشخاص، مانده، گردش و دریافتنی"],
    ["/app/suppliers", "تأمین‌کنندگان", `${suppliers} تأمین‌کننده فعال`, "بدهی، گردش و پرداختنی"],
    ["/app/sales", "فروش و فاکتور", `${invoices} فاکتور`, "فروش، برگشت، دریافت و سند حسابداری"],
    ["/app/purchases", "خرید و هزینه", `${purchases} سند خرید`, "خرید، هزینه، بدهی و سند حسابداری"],
    ["/app/inventory", "کالا و انبار", `${products} کالا/خدمت`, "موجودی، گردش کالا و بهای تمام‌شده"],
    ["/app/settlements", "تسویه‌ها", `${openBalances} مانده باز`, "دریافت، پرداخت و تخصیص به مانده‌ها"],
    ["/app/treasury", "خزانه", "بانک، صندوق و جریان نقد", "دریافت/پرداخت و انتقال وجه"],
    ["/app/cheques", "چک‌ها", "چرخه وصول و برگشت", "ثبت، سررسید، وصول، برگشت و Audit"],
  ] as const;

  return (
    <WorkspaceShell
      title="مرکز عملیات تجاری"
      eyebrow="فروش، خرید، اشخاص، کالا، خزانه و تسویه روی یک حقیقت مالی"
      actions={<Link href="/app/accounting" className="rounded-xl bg-[#102845] px-4 py-2.5 text-xs font-black text-white">مرکز حسابداری</Link>}
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([href,title,value,description]) => (
          <Link key={href} href={href} className="rounded-3xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#008f87]/40">
            <div className="text-xs font-black text-[#008f87]">{value}</div>
            <h2 className="mt-2 text-lg font-black text-[#0f223d]">{title}</h2>
            <p className="mt-3 text-xs leading-6 text-slate-500">{description}</p>
            <div className="mt-5 text-xs font-black text-[#00776f]">ورود ←</div>
          </Link>
        ))}
      </section>
    </WorkspaceShell>
  );
}
