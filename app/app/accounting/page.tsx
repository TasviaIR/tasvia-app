import Link from "next/link";
import { WorkspaceShell } from "../../../src/components/workspace/shell";
import { requireCurrentWorkspace } from "../../../src/auth/current-workspace";
import { prisma } from "../../../src/lib/prisma";

function number(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}

export default async function AccountingWorkspacePage() {
  const current = await requireCurrentWorkspace();

  const [
    accountCount,
    draftCount,
    postedCount,
    reversedCount,
    openPeriods,
    latestJournals,
  ] = await Promise.all([
    prisma.accountingAccount.count({
      where: { workspaceId: current.workspace.id, active: true },
    }),
    prisma.accountingJournal.count({
      where: { workspaceId: current.workspace.id, status: "DRAFT" },
    }),
    prisma.accountingJournal.count({
      where: { workspaceId: current.workspace.id, status: "POSTED" },
    }),
    prisma.accountingJournal.count({
      where: { workspaceId: current.workspace.id, status: "REVERSED" },
    }),
    prisma.fiscalPeriod.findMany({
      where: { workspaceId: current.workspace.id, status: "OPEN" },
      orderBy: { startsAt: "desc" },
      take: 3,
    }),
    prisma.accountingJournal.findMany({
      where: { workspaceId: current.workspace.id },
      include: {
        lines: {
          include: { account: true },
        },
      },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      take: 8,
    }),
  ]);

  const modules = [
    ["/app/accounting/chart", "درخت حساب‌ها", "کدینگ سلسله‌مراتبی، نوع حساب و وضعیت فعال"],
    ["/app/accounting/journals", "اسناد حسابداری", "پیش‌نویس، ثبت قطعی، برگشت و خطوط بدهکار/بستانکار"],
    ["/app/accounting/ledger", "دفتر کل و گردش حساب", "گردش ثبت‌های قطعی و مانده هر حساب"],
    ["/app/reports/financial", "تراز و صورت‌های مالی", "تراز آزمایشی، سود و زیان، ترازنامه، جریان نقد و Drill-down"],
    ["/app/fiscal-close", "سال و دوره مالی", "بستن، بازگشایی کنترل‌شده و سابقه حسابرسی"],
    ["/app/dimensions", "ابعاد حسابداری", "شعبه، مرکز هزینه و پروژه"],
    ["/app/audit", "ردپای حسابرسی", "Actor، زمان، تغییرات و عملیات حساس"],
    ["/app/evidence", "مستندات مالی", "Evidence، هش فایل و زنجیره مدرک"],
  ] as const;

  return (
    <WorkspaceShell
      title="مرکز حسابداری تسوین"
      eyebrow="هسته واقعی حسابداری دوبل؛ متصل به عملیات مالی، اسناد، دفاتر و گزارش‌ها"
      actions={
        <div className="flex flex-wrap gap-2">
          <Link href="/accounting/simple" className="rounded-xl bg-[#0f223d] px-4 py-2.5 text-xs font-black text-white">
            ثبت عملیات
          </Link>
          <Link href="/app/reports/financial" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black">
            گزارش‌های مالی
          </Link>
        </div>
      }
    >
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["حساب فعال", number(accountCount)],
          ["سند پیش‌نویس", number(draftCount)],
          ["سند ثبت قطعی", number(postedCount)],
          ["سند برگشتی", number(reversedCount)],
          ["دوره باز", number(openPeriods.length)],
        ].map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-xs font-bold text-slate-500">{label}</div>
            <div className="mt-3 text-2xl font-black text-[#0f223d]">{value}</div>
          </article>
        ))}
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {modules.map(([href, title, description]) => (
          <Link key={href} href={href} className="rounded-3xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#008f87]/40 hover:shadow-sm">
            <div className="text-xs font-black text-[#008f87]">ماژول حسابداری</div>
            <h2 className="mt-2 text-lg font-black text-[#0f223d]">{title}</h2>
            <p className="mt-3 text-xs leading-6 text-slate-500">{description}</p>
            <div className="mt-5 text-xs font-black text-[#00776f]">ورود به ماژول ←</div>
          </Link>
        ))}
      </section>

      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-black text-[#008f87]">دفتر روزانه</div>
            <h2 className="mt-1 text-lg font-black">آخرین اسناد حسابداری</h2>
          </div>
          <Link href="/app/accounting/journals" className="text-xs font-black text-[#00776f]">
            مشاهده همه اسناد ←
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="text-right text-xs text-slate-500">
                <th className="py-3">شماره</th>
                <th className="py-3">تاریخ</th>
                <th className="py-3">شرح</th>
                <th className="py-3">وضعیت</th>
                <th className="py-3">بدهکار</th>
                <th className="py-3">بستانکار</th>
              </tr>
            </thead>
            <tbody>
              {latestJournals.map((journal) => {
                const debit = journal.lines.reduce((sum, line) => sum + line.debit, 0n);
                const credit = journal.lines.reduce((sum, line) => sum + line.credit, 0n);
                return (
                  <tr key={journal.id} className="border-t border-slate-100">
                    <td className="py-3 font-black">{journal.number ?? "—"}</td>
                    <td className="py-3">{journal.occurredAt.toLocaleDateString("fa-IR")}</td>
                    <td className="py-3">{journal.description}</td>
                    <td className="py-3">{journal.status}</td>
                    <td className="py-3">{new Intl.NumberFormat("fa-IR").format(debit)}</td>
                    <td className="py-3">{new Intl.NumberFormat("fa-IR").format(credit)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </WorkspaceShell>
  );
}
