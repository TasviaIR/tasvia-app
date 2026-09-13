import { WorkspaceShell } from "../../../../src/components/workspace/shell";
import { requireCurrentWorkspace } from "../../../../src/auth/current-workspace";
import { prisma } from "../../../../src/lib/prisma";

function money(value: bigint) {
  return `${new Intl.NumberFormat("fa-IR").format(value)} ریال`;
}

export default async function AccountingJournalsPage() {
  const current = await requireCurrentWorkspace();

  const journals = await prisma.accountingJournal.findMany({
    where: { workspaceId: current.workspace.id },
    include: {
      fiscalPeriod: true,
      lines: { include: { account: true } },
    },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <WorkspaceShell title="اسناد و دفتر روزنامه" eyebrow="خطوط واقعی بدهکار و بستانکار، وضعیت ثبت و دوره مالی">
      <section className="space-y-4">
        {journals.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            هنوز سند حسابداری ثبت نشده است.
          </div>
        ) : journals.map((journal) => {
          const debit = journal.lines.reduce((sum, line) => sum + line.debit, 0n);
          const credit = journal.lines.reduce((sum, line) => sum + line.credit, 0n);
          return (
            <article key={journal.id} className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-black text-[#008f87]">
                    سند {journal.number ?? "بدون شماره"} · {journal.status}
                  </div>
                  <h2 className="mt-2 text-lg font-black text-[#0f223d]">{journal.description}</h2>
                  <div className="mt-2 text-xs text-slate-500">
                    {journal.occurredAt.toLocaleDateString("fa-IR")} · دوره: {journal.fiscalPeriod?.name ?? "—"}
                  </div>
                </div>
                <div className="text-left text-xs">
                  <div>بدهکار: <b>{money(debit)}</b></div>
                  <div className="mt-1">بستانکار: <b>{money(credit)}</b></div>
                  <div className={`mt-2 font-black ${debit === credit ? "text-emerald-600" : "text-red-600"}`}>
                    {debit === credit ? "سند متوازن" : "سند نامتوازن"}
                  </div>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[850px] text-sm">
                  <thead>
                    <tr className="text-right text-xs text-slate-500">
                      <th className="py-3">کد حساب</th>
                      <th className="py-3">حساب</th>
                      <th className="py-3">شرح</th>
                      <th className="py-3">بدهکار</th>
                      <th className="py-3">بستانکار</th>
                    </tr>
                  </thead>
                  <tbody>
                    {journal.lines.map((line) => (
                      <tr key={line.id} className="border-t border-slate-100">
                        <td className="py-3 font-black">{line.account.code}</td>
                        <td className="py-3">{line.account.name}</td>
                        <td className="py-3">{line.description ?? "—"}</td>
                        <td className="py-3">{money(line.debit)}</td>
                        <td className="py-3">{money(line.credit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          );
        })}
      </section>
    </WorkspaceShell>
  );
}
