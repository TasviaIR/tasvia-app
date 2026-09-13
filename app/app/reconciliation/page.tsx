import Link from "next/link";
import { WorkspaceShell } from "../../../src/components/workspace/shell";
import { JalaliDateInput } from "../../../src/components/date/jalali-date-input";
import { formatTasvinDate } from "../../../src/lib/tasvin-date";
import { requireCurrentWorkspace } from "../../../src/auth/current-workspace";
import { listReconciliationWorkspace, reconciliationConfidence } from "../../../src/application/reconciliation/reconciliation-service";
import { createEvidenceAction, matchEvidenceAction } from "./actions";

export default async function ReconciliationPage() {
  const current = await requireCurrentWorkspace();
  const data = await listReconciliationWorkspace(current.workspace.id);

  const pending = data.evidence.filter((x) => x.status === "PENDING");
  const matched = data.evidence.filter((x) => x.status === "MATCHED");

  return (
    <WorkspaceShell
      title="مغایرت‌گیری"
      eyebrow="کنترل و تطبیق واقعی"
      actions={<Link href="/app/treasury" className="rounded-xl border px-4 py-2.5 text-xs font-black">خزانه</Link>}
    >
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["در انتظار تطبیق", pending.length],
          ["تطبیق‌شده", matched.length],
          ["ردشده", data.evidence.filter((x) => x.status === "REJECTED").length],
          ["گردش خزانه", data.journalLines.length],
        ].map(([a, b]) => (
          <article key={String(a)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_25px_rgba(15,34,61,.04)]">
            <div className="text-xs font-bold text-slate-500">{a}</div>
            <div className="mt-3 text-xl font-black">{new Intl.NumberFormat("fa-IR").format(Number(b))}</div>
          </article>
        ))}
      </section>

      <form action={createEvidenceAction} className="mt-5 grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_25px_rgba(15,34,61,.04)] md:grid-cols-3 xl:grid-cols-6">
        <select name="accountCode" className="rounded-xl border p-3">
          {data.treasuryAccounts.map((a) => <option key={a.id} value={a.code}>{a.name}</option>)}
        </select>
        <select name="direction" className="rounded-xl border p-3">
          <option value="IN">ورودی بانک</option>
          <option value="OUT">خروجی بانک</option>
        </select>
        <input name="externalRef" required placeholder="مرجع بانک" className="rounded-xl border p-3" />
        <input name="amount" required placeholder="مبلغ" className="rounded-xl border p-3" />
        <JalaliDateInput name="occurredAt" required className="rounded-xl border p-3" />
        <button className="rounded-xl bg-[#102845] p-3 font-black text-white">ثبت شاهد بانکی</button>
      </form>

      <section className="mt-5 overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-[0_8px_25px_rgba(15,34,61,.04)]">
        <table className="w-full min-w-[1000px] text-right text-xs">
          <thead className="bg-slate-50">
            <tr>{["مرجع","مبلغ","تاریخ","وضعیت","بهترین تطابق","اطمینان","اقدام"].map((x)=><th key={x} className="p-4">{x}</th>)}</tr>
          </thead>
          <tbody>
            {data.evidence.length === 0 ? (
              <tr><td colSpan={7} className="p-10 text-center">هنوز شاهد بانکی ثبت نشده است.</td></tr>
            ) : data.evidence.map((e) => {
              const candidates = data.journalLines
                .filter((line) => line.account.code === e.accountCode)
                .map((line) => {
                  const amount = line.debit > 0n ? line.debit : line.credit;
                  const score = reconciliationConfidence({
                    evidenceAmount: e.amount,
                    journalAmount: amount,
                    evidenceDate: e.occurredAt,
                    journalDate: line.journal.occurredAt,
                    evidenceRef: e.externalRef,
                    journalRef: line.journal.sourceDocumentId,
                  });
                  return { line, score, amount };
                })
                .sort((a,b)=>b.score-a.score);
              const best = candidates[0];

              return (
                <tr key={e.id} className="border-t">
                  <td className="p-4 font-black">{e.externalRef}</td>
                  <td className="p-4">{new Intl.NumberFormat("fa-IR").format(e.amount)} ریال</td>
                  <td className="p-4">{formatTasvinDate(e.occurredAt)}</td>
                  <td className="p-4"><span className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-black text-slate-600">{e.status === "PENDING" ? "در انتظار" : e.status === "MATCHED" ? "تطبیق‌شده" : "ردشده"}</span></td>
                  <td className="p-4">{best?.line.journal.description ?? "—"}</td>
                  <td className="p-4">{best ? `${new Intl.NumberFormat("fa-IR").format(best.score)}٪` : "—"}</td>
                  <td className="p-4">
                    {e.status === "PENDING" && best && best.score >= 60 ? (
                      <form action={async()=>{"use server";await matchEvidenceAction(e.id,best.line.id)}}>
                        <button className="rounded-lg bg-[#102845] px-3 py-2 text-white">تأیید تطبیق</button>
                      </form>
                    ) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </WorkspaceShell>
  );
}
