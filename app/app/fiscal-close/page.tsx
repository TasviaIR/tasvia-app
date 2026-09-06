import { WorkspaceShell } from "../../../src/components/workspace/shell";
import { requireCurrentWorkspace } from "../../../src/auth/current-workspace";
import { fiscalCloseReadiness, listFiscalPeriods, listFiscalReopenAudits } from "../../../src/application/accounting/fiscal-close-service";
import { closeFiscalPeriodAction, reopenFiscalPeriodAction } from "./actions";

export default async function FiscalClosePage() {
  const current = await requireCurrentWorkspace();
  const periods = await listFiscalPeriods(current.workspace.id);
  const [readiness, reopenAudits] = await Promise.all([
    Promise.all(periods.map((p) => fiscalCloseReadiness(current.workspace.id, p.id))),
    Promise.all(periods.map((p) => listFiscalReopenAudits(current.workspace.id, p.id))),
  ]);

  return (
    <WorkspaceShell eyebrow="کنترل پایان دوره" title="بستن دوره مالی">
      <section className="space-y-4">{readiness.length === 0 ? <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">هنوز دوره مالی برای این فضای کاری تعریف نشده است.</div> : null}
        {readiness.map((r, index) => (
          <article key={r.period.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_25px_rgba(15,34,61,.04)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-black">{r.period.name}</h2>
                <div className="mt-2 text-xs text-slate-500">
                  {new Intl.DateTimeFormat("fa-IR").format(r.period.startsAt)} تا {new Intl.DateTimeFormat("fa-IR").format(r.period.endsAt)}
                </div>
              </div>
              <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black">
                {r.period.status === "OPEN" ? "باز" : "بسته"}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4 text-xs">سند پیش‌نویس: <b>{r.blockers.draftJournals}</b></div>
              <div className="rounded-xl bg-slate-50 p-4 text-xs">مطالبات باز: <b>{r.warnings.openReceivables}</b></div>
              <div className="rounded-xl bg-slate-50 p-4 text-xs">بدهی باز: <b>{r.warnings.openPayables}</b></div>
            </div>

            {r.period.status === "OPEN" ? (
              <form className="mt-4" action={async()=>{"use server";await closeFiscalPeriodAction(r.period.id)}}>
                <button
                  disabled={!r.canClose}
                  className="rounded-xl bg-[#102845] px-4 py-3 text-xs font-black text-white disabled:opacity-40"
                >
                  بستن قطعی دوره
                </button>
              </form>
            ) : (
              <form
                className="mt-4 flex flex-col gap-3 md:flex-row"
                action={reopenFiscalPeriodAction.bind(null, r.period.id)}
              >
                <input
                  name="reason"
                  required
                  minLength={10}
                  placeholder="دلیل بازگشایی دوره مالی"
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-xs"
                />
                <button className="rounded-xl border border-slate-300 px-4 py-3 text-xs font-black">
                  بازگشایی کنترل‌شده
                </button>
              </form>
            )}

            <section
              aria-label={`تاریخچه بازگشایی ${r.period.name}`}
              className="mt-5 border-t border-slate-100 pt-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">تاریخچه بازگشایی دوره</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    هر بازگشایی با دلیل، عامل و زمان ثبت‌شده به‌صورت حسابرسی‌پذیر نگهداری می‌شود.
                  </p>
                </div>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">
                  {reopenAudits[index].length.toLocaleString("fa-IR")} رویداد
                </span>
              </div>

              {reopenAudits[index].length === 0 ? (
                <div
                  data-testid="fiscal-reopen-audit-empty"
                  className="mt-3 rounded-xl bg-slate-50 px-4 py-4 text-xs text-slate-500"
                >
                  برای این دوره هنوز سابقه بازگشایی ثبت نشده است.
                </div>
              ) : (
                <div className="mt-3 space-y-3" data-testid="fiscal-reopen-audit-history">
                  {reopenAudits[index].map((audit) => (
                    <article
                      key={audit.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="text-xs font-black text-slate-800">
                          {audit.beforeStatus === "CLOSED" ? "بسته" : "باز"}
                          {" ← "}
                          {audit.afterStatus === "OPEN" ? "باز" : "بسته"}
                        </div>
                        <time
                          className="text-[11px] text-slate-500"
                          dateTime={audit.occurredAt.toISOString()}
                        >
                          {new Intl.DateTimeFormat("fa-IR", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(audit.occurredAt)}
                        </time>
                      </div>

                      <p className="mt-3 text-xs leading-6 text-slate-700">{audit.reason}</p>

                      <div className="mt-3 text-[11px] text-slate-500">
                        عامل ثبت‌شده: <span className="font-mono">{audit.actorId}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </article>
        ))}
      </section>
    </WorkspaceShell>
  );
}
