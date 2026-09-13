import { WorkspaceShell } from "../../../src/components/workspace/shell";
import { requireCurrentWorkspace } from "../../../src/auth/current-workspace";
import { listFinancialEvidence } from "../../../src/application/evidence/financial-evidence-service";
import {
  archiveEvidenceAction,
  registerEvidenceAction,
} from "./actions";

export default async function EvidencePage() {
  const current = await requireCurrentWorkspace();
  const rows = await listFinancialEvidence(current.workspace.id);
  const canManage = current.role !== "VIEWER";

  return (
    <WorkspaceShell
      title="مستندات و شواهد مالی"
      eyebrow="متادیتای کنترل‌شده برای پیوست‌های اسناد و عملیات مالی"
    >
      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-black">ثبت مرجع فایل</h2>
        <p className="mt-2 text-xs leading-6 text-slate-500">
          این بخش فقط مرجع امن فایل ذخیره‌شده در Storage را ثبت می‌کند؛
          فعال‌سازی Storage واقعی در مرحله انتشار انجام می‌شود.
        </p>

        {canManage ? (
          <form action={registerEvidenceAction} className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input name="category" required placeholder="دسته‌بندی؛ مثلاً فاکتور" className="rounded-xl border px-3 py-2 text-xs" />
            <input name="sourceEntityType" required placeholder="نوع منبع؛ مثلاً SalesInvoice" className="rounded-xl border px-3 py-2 text-xs" />
            <input name="sourceEntityId" required placeholder="شناسه منبع" className="rounded-xl border px-3 py-2 text-xs" />
            <input name="journalId" placeholder="شناسه سند حسابداری (اختیاری)" className="rounded-xl border px-3 py-2 text-xs" />
            <input name="safeFileName" required placeholder="نام امن فایل" className="rounded-xl border px-3 py-2 text-xs" />
            <input name="mimeType" required placeholder="MIME Type" className="rounded-xl border px-3 py-2 text-xs" />
            <input name="byteSize" required inputMode="numeric" placeholder="اندازه فایل (بایت)" className="rounded-xl border px-3 py-2 text-xs" />
            <input name="sha256" required dir="ltr" placeholder="SHA-256" className="rounded-xl border px-3 py-2 text-xs" />
            <input name="storageKey" required dir="ltr" placeholder="Storage Key" className="rounded-xl border px-3 py-2 text-xs xl:col-span-2" />
            <input name="description" placeholder="توضیح (اختیاری)" className="rounded-xl border px-3 py-2 text-xs xl:col-span-2" />
            <button className="rounded-xl bg-[#0f223d] px-4 py-2.5 text-xs font-black text-white xl:col-span-4">
              ثبت مرجع مستند
            </button>
          </form>
        ) : (
          <div className="mt-5 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            دسترسی شما فقط‌خواندنی است.
          </div>
        )}
      </section>

      {rows.length === 0 ? (
        <section data-testid="evidence-empty-state" className="mt-5 rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          هنوز مستند مالی ثبت نشده است.
        </section>
      ) : (
        <section className="mt-5 space-y-3">
          {rows.map((row) => (
            <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <div className="text-sm font-black">{row.safeFileName}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {row.category} · {row.sourceEntityType} · {row.sourceEntityId}
                  </div>
                </div>
                <div className="text-left text-[11px] text-slate-400">
                  {new Intl.NumberFormat("fa-IR").format(row.byteSize)} بایت
                </div>
              </div>

              <div className="mt-3 grid gap-2 text-[11px] text-slate-500 md:grid-cols-3">
                <span>MIME: {row.mimeType}</span>
                <span>آپلودکننده: {row.uploadedBy}</span>
                <span>سند حسابداری: {row.journalId ?? "—"}</span>
              </div>

              <div dir="ltr" className="mt-3 break-all rounded-xl bg-slate-50 p-3 text-[10px] text-slate-500">
                SHA-256: {row.sha256}
              </div>

              {canManage ? (
                <form action={archiveEvidenceAction} className="mt-3 flex gap-2">
                  <input type="hidden" name="evidenceId" value={row.id} />
                  <input
                    name="reason"
                    required
                    minLength={8}
                    placeholder="دلیل آرشیو"
                    className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-xs"
                  />
                  <button className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">
                    آرشیو
                  </button>
                </form>
              ) : null}
            </article>
          ))}
        </section>
      )}
    </WorkspaceShell>
  );
}
