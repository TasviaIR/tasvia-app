import Link from "next/link";
import { WorkspaceShell } from "../../../src/components/workspace/shell";
import { requireCurrentWorkspace } from "../../../src/auth/current-workspace";
import { prisma } from "../../../src/lib/prisma";

export default async function OperationsControlsPage() {
  const current = await requireCurrentWorkspace();

  const [evidence, dimensions, payroll, assets, periods, audits] = await Promise.all([
    prisma.financialEvidence.count({ where: { workspaceId: current.workspace.id, archivedAt: null } }),
    prisma.accountingDimensionValue.count({ where: { workspaceId: current.workspace.id, active: true } }),
    prisma.payrollRun.count({ where: { workspaceId: current.workspace.id } }),
    prisma.fixedAsset.count({ where: { workspaceId: current.workspace.id } }),
    prisma.fiscalPeriod.count({ where: { workspaceId: current.workspace.id } }),
    prisma.auditEvent.count({ where: { workspaceId: current.workspace.id } }),
  ]);

  const modules = [
    ["/app/evidence", "آرشیو و مستندات", `${evidence} مدرک فعال`, "فایل، هش، منبع و سابقه آرشیو"],
    ["/app/dimensions", "ابعاد حسابداری", `${dimensions} مقدار فعال`, "شعبه، مرکز هزینه و پروژه"],
    ["/app/payroll", "حقوق و دستمزد", `${payroll} دوره حقوق`, "کارکنان، محاسبات و ثبت حسابداری"],
    ["/app/fixed-assets", "دارایی ثابت", `${assets} دارایی`, "تحصیل، استهلاک و ارزش دفتری"],
    ["/app/fiscal-close", "سال و دوره مالی", `${periods} دوره`, "قفل، بستن، بازگشایی و کنترل دوره"],
    ["/app/audit", "ردپای حسابرسی", `${audits} رویداد`, "Actor، زمان، before/after و reason"],
    ["/app/reconciliation", "مغایرت‌گیری", "کنترل بانکی", "تطبیق شواهد بانکی با حقیقت خزانه"],
    ["/app/reports/financial", "گزارش‌های مالی", "دفتر و صورت مالی", "تراز، سود و زیان، ترازنامه و جریان نقد"],
  ] as const;

  return (
    <WorkspaceShell
      title="مرکز عملیات پیشرفته"
      eyebrow="کنترل دوره، دارایی، حقوق، مستندات و حسابرسی متصل به هسته مالی"
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {modules.map(([href,title,value,description]) => (
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
