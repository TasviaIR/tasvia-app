import { WorkspaceShell } from "../../../src/components/workspace/shell";
import { requireCurrentWorkspace } from "../../../src/auth/current-workspace";
import { prisma } from "../../../src/lib/prisma";
import { CounterpartyImportForm } from "./counterparty-import-form";
import { resolveWorkspaceRestoreReadiness } from "../../../src/production/workspace-restore-readiness";

export default async function DataPortabilityPage() {
  const current = await requireCurrentWorkspace();

  const [jobs, restoreEvidence, restoreReadiness] = await Promise.all([
    prisma.dataImportJob.findMany({
      where: {
        workspaceId: current.workspace.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    }),
    prisma.restoreRehearsalEvidence.findMany({
      where: {
        workspaceId: current.workspace.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),
    resolveWorkspaceRestoreReadiness(current.workspace.id),
  ]);

  return (
    <WorkspaceShell
      title="انتقال داده و بازیابی"
      eyebrow="ورود کنترل‌شده، خروجی، Dry Run، Audit و شواهد بازیابی"
    >
      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-black text-[#0f223d]">
            ورود مشتری و تأمین‌کننده
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            فایل ابتدا فقط بررسی می‌شود. تا زمانی که Dry Run بدون خطا نباشد،
            هیچ داده‌ای وارد Workspace نمی‌شود.
          </p>

          <div className="mt-5">
            <CounterpartyImportForm />
          </div>
        </section>

        <section className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-black text-[#0f223d]">
              خروجی‌های فعلی
            </h2>
            <div className="mt-4 space-y-3 text-sm">
              <a
                href="/app/reports/financial/export"
                className="block rounded-2xl border border-slate-200 p-4 font-bold text-[#00776f]"
              >
                خروجی CSV گزارش‌های مالی
              </a>
              <a
                href="/app/audit/export"
                className="block rounded-2xl border border-slate-200 p-4 font-bold text-[#00776f]"
              >
                خروجی Audit Trail
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-black text-[#0f223d]">
              وضعیت بازیابی
            </h2>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-black text-[#0f223d]">
                {restoreReadiness.hasPassingRestoreRehearsal
                  ? "آمادگی بازیابی تأیید شده"
                  : "آمادگی بازیابی هنوز تأیید نشده"}
              </div>
              <p className="mt-2 text-xs leading-6 text-slate-500">
                برای عبور از Gate انتشار، حداقل یک Restore Rehearsal موفق
                و ثبت‌شده برای همین Workspace لازم است.
              </p>
            </div>

            {restoreEvidence.length === 0 ? (
              <p className="mt-3 text-sm leading-7 text-amber-700">
                هنوز شواهد Restore Rehearsal برای این Workspace ثبت نشده است.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {restoreEvidence.map((evidence) => (
                  <div
                    key={evidence.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="text-sm font-black text-[#0f223d]">
                      {evidence.passed ? "قبول" : "رد شده"}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {evidence.createdAt.toLocaleString("fa-IR")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-black text-[#0f223d]">
          تاریخچه Import
        </h2>

        {jobs.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            هنوز Import Job ثبت نشده است.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-right text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="p-3">فایل</th>
                  <th className="p-3">وضعیت</th>
                  <th className="p-3">کل</th>
                  <th className="p-3">معتبر</th>
                  <th className="p-3">خطادار</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b border-slate-100">
                    <td className="p-3 font-bold">{job.filename}</td>
                    <td className="p-3">{job.status}</td>
                    <td className="p-3">{job.totalRows}</td>
                    <td className="p-3">{job.acceptedRows}</td>
                    <td className="p-3">{job.rejectedRows}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </WorkspaceShell>
  );
}
