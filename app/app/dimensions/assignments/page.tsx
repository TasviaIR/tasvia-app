import type { AccountingDimensionType } from "@prisma/client";
import Link from "next/link";
import { WorkspaceShell } from "../../../../src/components/workspace/shell";
import { requireCurrentWorkspace } from "../../../../src/auth/current-workspace";
import {
  buildDimensionReportSummary,
  listDimensionAssignmentWorkspace,
} from "../../../../src/application/accounting/dimension-assignment-service";
import { setDimensionAssignmentAction } from "./actions";

const dimensionTypes: Array<{
  type: AccountingDimensionType;
  label: string;
}> = [
  { type: "BRANCH", label: "شعبه" },
  { type: "COST_CENTER", label: "مرکز هزینه" },
  { type: "PROJECT", label: "پروژه" },
];

function formatMoney(value: bigint): string {
  return new Intl.NumberFormat("fa-IR").format(value);
}

export default async function DimensionAssignmentsPage() {
  const current = await requireCurrentWorkspace();
  const canManage = current.role !== "VIEWER";

  const [{ values, lines }, branchReport, costCenterReport, projectReport] =
    await Promise.all([
      listDimensionAssignmentWorkspace(current.workspace.id),
      buildDimensionReportSummary(current.workspace.id, "BRANCH"),
      buildDimensionReportSummary(current.workspace.id, "COST_CENTER"),
      buildDimensionReportSummary(current.workspace.id, "PROJECT"),
    ]);

  const reports = new Map<AccountingDimensionType, typeof branchReport>([
    ["BRANCH", branchReport],
    ["COST_CENTER", costCenterReport],
    ["PROJECT", projectReport],
  ]);

  return (
    <WorkspaceShell
      title="تخصیص ابعاد حسابداری"
      eyebrow="شعبه، مرکز هزینه و پروژه روی خطوط سند حسابداری"
    >
      <div className="mb-5 flex flex-wrap gap-3">
        <Link
          href="/app/dimensions"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-[#008f87]"
        >
          مدیریت ابعاد
        </Link>
        <Link
          href="/accounting/professional"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-[#008f87]"
        >
          حسابداری حرفه‌ای
        </Link>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <div>
          <h2 className="text-lg font-black">خطوط سند پیش‌نویس</h2>
          <p className="mt-2 text-xs leading-6 text-slate-500">
            تخصیص فقط روی سند پیش‌نویس قابل تغییر است. پس از ثبت قطعی، بعد مالی سند قفل می‌شود.
          </p>
        </div>

        {lines.length === 0 ? (
          <div
            data-testid="dimension-assignment-empty"
            className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500"
          >
            خط سند پیش‌نویسی برای تخصیص وجود ندارد.
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {lines.map((line) => (
              <article
                key={line.id}
                className="rounded-2xl border border-slate-100 p-4"
              >
                <div className="grid gap-2 md:grid-cols-4">
                  <div>
                    <div className="text-[10px] text-slate-400">سند</div>
                    <div className="mt-1 text-xs font-black">
                      {line.journal.number ?? "پیش‌نویس"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">حساب</div>
                    <div className="mt-1 text-xs font-black">
                      {line.account.code} — {line.account.name}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">بدهکار</div>
                    <div className="mt-1 text-xs font-black">
                      {formatMoney(line.debit)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">بستانکار</div>
                    <div className="mt-1 text-xs font-black">
                      {formatMoney(line.credit)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-3">
                  {dimensionTypes.map(({ type, label }) => {
                    const options = values.filter(
                      (value) => value.type === type && value.active,
                    );
                    const currentAssignment = line.dimensionAssignments.find(
                      (assignment) => assignment.type === type,
                    );

                    return (
                      <div
                        key={type}
                        className="rounded-2xl bg-slate-50 p-4"
                      >
                        <div className="text-xs font-black">{label}</div>

                        {currentAssignment ? (
                          <div className="mt-2 text-[11px] leading-6 text-slate-500">
                            {currentAssignment.allocations
                              .map(
                                (allocation) =>
                                  `${allocation.dimensionValue.name} — ${
                                    allocation.basisPoints / 100
                                  }٪`,
                              )
                              .join("، ")}
                          </div>
                        ) : (
                          <div className="mt-2 text-[11px] text-slate-400">
                            تخصیص ثبت نشده
                          </div>
                        )}

                        {canManage && options.length > 0 ? (
                          <form
                            action={setDimensionAssignmentAction}
                            className="mt-3 space-y-2"
                          >
                            <input
                              type="hidden"
                              name="journalLineId"
                              value={line.id}
                            />
                            <input type="hidden" name="type" value={type} />

                            {[1, 2, 3].map((slot) => (
                              <div
                                key={slot}
                                className="grid grid-cols-[1fr_88px] gap-2"
                              >
                                <select
                                  name={`dimensionValueId${slot}`}
                                  className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs"
                                >
                                  <option value="">
                                    {slot === 1 ? "انتخاب مقدار" : "اختیاری"}
                                  </option>
                                  {options.map((value) => (
                                    <option key={value.id} value={value.id}>
                                      {value.code} — {value.name}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  name={`percent${slot}`}
                                  inputMode="decimal"
                                  placeholder="درصد"
                                  className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs"
                                />
                              </div>
                            ))}

                            <div className="text-[10px] leading-5 text-slate-400">
                              مجموع درصدهای واردشده باید دقیقاً ۱۰۰٪ باشد.
                            </div>

                            <button className="w-full rounded-xl bg-[#0f223d] px-3 py-2 text-xs font-black text-white">
                              ثبت تخصیص
                            </button>
                          </form>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-3">
        {dimensionTypes.map(({ type, label }) => {
          const report = reports.get(type) ?? [];

          return (
            <article
              key={type}
              className="rounded-3xl border border-slate-200 bg-white p-5"
            >
              <h2 className="font-black">گزارش ثبت‌شده بر اساس {label}</h2>
              <p className="mt-2 text-xs leading-6 text-slate-500">
                فقط اسناد ثبت قطعی در این خلاصه محاسبه می‌شوند.
              </p>

              {report.length === 0 ? (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs text-slate-500">
                  هنوز داده ثبت قطعی برای این بُعد وجود ندارد.
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {report.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-xl border border-slate-100 p-3"
                    >
                      <div className="text-xs font-black">
                        {row.code} — {row.name}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                        <span>بدهکار: {formatMoney(row.debit)}</span>
                        <span>بستانکار: {formatMoney(row.credit)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </section>
    </WorkspaceShell>
  );
}
