import type { AccountingDimensionType } from "@prisma/client";
import Link from "next/link";
import { WorkspaceShell } from "../../../../src/components/workspace/shell";
import { requireCurrentWorkspace } from "../../../../src/auth/current-workspace";
import { prisma } from "../../../../src/lib/prisma";
import { buildProfessionalFinancialReport } from "../../../../src/application/accounting/professional-financial-report";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function money(value: bigint) { return `${new Intl.NumberFormat("fa-IR").format(value)} ریال`; }
function parseDate(value: string | string[] | undefined, end = false) {
  if (typeof value !== "string" || !value) return undefined;
  const date = new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
function parseDimensionType(value: string | string[] | undefined): AccountingDimensionType | undefined {
  return value === "BRANCH" || value === "COST_CENTER" || value === "PROJECT" ? value : undefined;
}

export default async function FinancialReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const current = await requireCurrentWorkspace();
  const params = await searchParams;
  const dimensionType = parseDimensionType(params.dimensionType);
  const dimensionValueId = typeof params.dimensionValueId === "string" && params.dimensionValueId ? params.dimensionValueId : undefined;
  const filters = { from: parseDate(params.from), to: parseDate(params.to, true), dimensionType, dimensionValueId };

  const [report, dimensions] = await Promise.all([
    buildProfessionalFinancialReport(current.workspace.id, filters),
    prisma.accountingDimensionValue.findMany({ where: { workspaceId: current.workspace.id, active: true }, orderBy: [{ type: "asc" }, { code: "asc" }] }),
  ]);

  const exportParams = new URLSearchParams();
  if (typeof params.from === "string") exportParams.set("from", params.from);
  if (typeof params.to === "string") exportParams.set("to", params.to);
  if (dimensionType) exportParams.set("dimensionType", dimensionType);
  if (dimensionValueId) exportParams.set("dimensionValueId", dimensionValueId);

  return (
    <WorkspaceShell title="گزارش‌های مالی حرفه‌ای" eyebrow="دفتر، تراز و صورت‌های مالی فقط بر پایه اسناد ثبت قطعی" actions={<div className="flex flex-wrap gap-2"><a href={`/app/reports/financial/export?${exportParams.toString()}`} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black">خروجی CSV</a><Link href="/app/dimensions/assignments" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black">ابعاد مالی</Link></div>}>
      <form method="get" className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 md:grid-cols-5">
        <input type="date" name="from" defaultValue={typeof params.from === "string" ? params.from : ""} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <input type="date" name="to" defaultValue={typeof params.to === "string" ? params.to : ""} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <select name="dimensionType" defaultValue={dimensionType ?? ""} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">همه ابعاد</option><option value="BRANCH">شعبه</option><option value="COST_CENTER">مرکز هزینه</option><option value="PROJECT">پروژه</option></select>
        <select name="dimensionValueId" defaultValue={dimensionValueId ?? ""} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">همه مقادیر</option>{dimensions.filter((item) => !dimensionType || item.type === dimensionType).map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</select>
        <button className="rounded-xl bg-[#0f223d] px-4 py-2 text-sm font-black text-white">اعمال فیلتر</button>
      </form>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[["درآمد", money(report.profitAndLoss.revenue)],["هزینه", money(report.profitAndLoss.expenses)],["سود/زیان خالص", money(report.profitAndLoss.netIncome)],["جریان خالص نقد", money(report.cashFlow.netCashFlow)]].map(([label,value]) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="text-xs font-bold text-slate-500">{label}</div><div className="mt-3 text-lg font-black">{value}</div></article>)}
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-black">صورت سود و زیان</h2><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><span>درآمد</span><b>{money(report.profitAndLoss.revenue)}</b></div><div className="flex justify-between"><span>هزینه</span><b>{money(report.profitAndLoss.expenses)}</b></div><div className="flex justify-between border-t pt-3"><span>سود/زیان خالص</span><b>{money(report.profitAndLoss.netIncome)}</b></div></div></article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-black">ترازنامه</h2><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><span>دارایی‌ها</span><b>{money(report.balanceSheet.assets)}</b></div><div className="flex justify-between"><span>بدهی‌ها</span><b>{money(report.balanceSheet.liabilities)}</b></div><div className="flex justify-between"><span>حقوق مالکانه</span><b>{money(report.balanceSheet.equity)}</b></div><div className="flex justify-between"><span>سود انباشته دوره</span><b>{money(report.balanceSheet.retainedEarnings)}</b></div><div className="flex justify-between border-t pt-3"><span>اختلاف تراز</span><b>{money(report.balanceSheet.difference)}</b></div></div></article>
      </section>

      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-black">تراز آزمایشی</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr><th className="py-3 text-right">کد</th><th className="py-3 text-right">حساب</th><th className="py-3 text-right">بدهکار</th><th className="py-3 text-right">بستانکار</th><th className="py-3 text-right">مانده</th></tr></thead><tbody>{report.trialBalance.map((row) => <tr key={row.accountId} className="border-t border-slate-100"><td className="py-3">{row.code}</td><td className="py-3">{row.name}</td><td className="py-3">{money(row.debit)}</td><td className="py-3">{money(row.credit)}</td><td className="py-3 font-black">{money(row.balance)}</td></tr>)}</tbody></table></div></section>

      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-black">دفتر روزنامه و Drill-down سند</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[980px] text-sm"><thead><tr><th className="py-3 text-right">تاریخ</th><th className="py-3 text-right">سند</th><th className="py-3 text-right">حساب</th><th className="py-3 text-right">شرح</th><th className="py-3 text-right">بدهکار</th><th className="py-3 text-right">بستانکار</th></tr></thead><tbody>{report.journal.map((row,index) => <tr key={`${row.journalId}:${row.accountId}:${index}`} className="border-t border-slate-100"><td className="py-3">{row.occurredAt.toLocaleDateString("fa-IR")}</td><td className="py-3">{row.journalNumber ?? "—"}</td><td className="py-3">{row.accountCode} — {row.accountName}</td><td className="py-3">{row.description}</td><td className="py-3">{money(row.debit)}</td><td className="py-3">{money(row.credit)}</td></tr>)}</tbody></table></div></section>
    </WorkspaceShell>
  );
}
