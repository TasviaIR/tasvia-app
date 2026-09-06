import { WorkspaceShell } from "../../../src/components/workspace/shell";
import { requireCurrentWorkspace } from "../../../src/auth/current-workspace";
import { listAuditEvents } from "../../../src/application/audit/audit-service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function value(input: string | string[] | undefined): string | undefined {
  return typeof input === "string" && input.trim() ? input.trim() : undefined;
}

function parseDate(input: string | string[] | undefined, endOfDay = false): Date | undefined {
  const raw = value(input);
  if (!raw) return undefined;
  const parsed = new Date(`${raw}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

const severityLabel: Record<string, string> = {
  INFO: "اطلاعاتی",
  WARNING: "هشدار",
  CRITICAL: "حساس",
};

export default async function AuditPage({ searchParams }: { searchParams: SearchParams }) {
  const current = await requireCurrentWorkspace();
  const params = await searchParams;

  const filters = {
    actorId: value(params.actorId),
    action: value(params.action),
    category: value(params.category),
    severity: value(params.severity),
    entityType: value(params.entityType),
    entityId: value(params.entityId),
    from: parseDate(params.from),
    to: parseDate(params.to, true),
    take: 150,
  };

  const events = await listAuditEvents(current.workspace.id, filters);

  const exportParams = new URLSearchParams();
  for (const key of ["actorId","action","category","severity","entityType","entityId","from","to"]) {
    const item = value(params[key]);
    if (item) exportParams.set(key, item);
  }

  return (
    <WorkspaceShell
      title="ردپای حسابرسی"
      eyebrow="تاریخچه غیرقابل‌تغییر عملیات حساس و مالی"
      actions={
        <a href={`/app/audit/export?${exportParams.toString()}`} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black">
          خروجی CSV
        </a>
      }
    >
      <form method="get" className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 md:grid-cols-4 xl:grid-cols-8">
        <input name="action" defaultValue={value(params.action) ?? ""} placeholder="عملیات" className="rounded-xl border border-slate-200 px-3 py-2 text-xs" />
        <input name="actorId" defaultValue={value(params.actorId) ?? ""} placeholder="شناسه کاربر" className="rounded-xl border border-slate-200 px-3 py-2 text-xs" />
        <input name="entityType" defaultValue={value(params.entityType) ?? ""} placeholder="نوع موجودیت" className="rounded-xl border border-slate-200 px-3 py-2 text-xs" />
        <input name="entityId" defaultValue={value(params.entityId) ?? ""} placeholder="شناسه موجودیت" className="rounded-xl border border-slate-200 px-3 py-2 text-xs" />
        <select name="severity" defaultValue={value(params.severity) ?? ""} className="rounded-xl border border-slate-200 px-3 py-2 text-xs">
          <option value="">همه سطح‌ها</option>
          <option value="INFO">اطلاعاتی</option>
          <option value="WARNING">هشدار</option>
          <option value="CRITICAL">حساس</option>
        </select>
        <input type="date" name="from" defaultValue={value(params.from) ?? ""} className="rounded-xl border border-slate-200 px-3 py-2 text-xs" />
        <input type="date" name="to" defaultValue={value(params.to) ?? ""} className="rounded-xl border border-slate-200 px-3 py-2 text-xs" />
        <button className="rounded-xl bg-[#0f223d] px-4 py-2 text-xs font-black text-white">اعمال</button>
      </form>

      {events.length === 0 ? (
        <section data-testid="audit-empty-state" className="mt-5 rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          هنوز رویداد حسابرسی مطابق این فیلتر ثبت نشده است.
        </section>
      ) : (
        <section className="mt-5 space-y-3">
          {events.map((event) => (
            <article key={event.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-900">{event.action}</div>
                  <div className="mt-1 text-xs text-slate-500">{event.category} · {event.entityType} · {event.entityId}</div>
                </div>
                <div className="text-left">
                  <div className="text-xs font-black text-[#008f87]">{severityLabel[event.severity] ?? event.severity}</div>
                  <time dateTime={event.createdAt.toISOString()} className="mt-1 block text-[11px] text-slate-400">
                    {event.createdAt.toLocaleString("fa-IR")}
                  </time>
                </div>
              </div>

              <div className="mt-3 grid gap-2 text-[11px] text-slate-500 md:grid-cols-3">
                <span>عامل: {event.actorId}</span>
                <span>نقش: {event.actorRole ?? "—"}</span>
                <span>درخواست: {event.requestId ?? "—"}</span>
              </div>

              {event.reason ? (
                <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-6 text-slate-600">{event.reason}</p>
              ) : null}
            </article>
          ))}
        </section>
      )}
    </WorkspaceShell>
  );
}
