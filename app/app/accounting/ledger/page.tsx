import { WorkspaceShell } from "../../../../src/components/workspace/shell";
import { requireCurrentWorkspace } from "../../../../src/auth/current-workspace";
import { prisma } from "../../../../src/lib/prisma";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function money(value: bigint) {
  return `${new Intl.NumberFormat("fa-IR").format(value)} ریال`;
}

export default async function GeneralLedgerPage({ searchParams }: { searchParams: SearchParams }) {
  const current = await requireCurrentWorkspace();
  const params = await searchParams;
  const accountId = typeof params.accountId === "string" ? params.accountId : undefined;

  const accounts = await prisma.accountingAccount.findMany({
    where: { workspaceId: current.workspace.id, active: true },
    orderBy: { code: "asc" },
  });

  const selected = accountId
    ? accounts.find((account) => account.id === accountId)
    : accounts[0];

  const lines = selected
    ? await prisma.accountingJournalLine.findMany({
        where: {
          accountId: selected.id,
          journal: {
            workspaceId: current.workspace.id,
            status: "POSTED",
          },
        },
        include: { journal: true },
        orderBy: [{ journal: { occurredAt: "asc" } }, { createdAt: "asc" }],
      })
    : [];

  const rows = lines.reduce<
    Array<(typeof lines)[number] & { runningBalance: bigint }>
  >((acc, line) => {
    const previous = acc.length > 0 ? acc[acc.length - 1].runningBalance : 0n;
    acc.push({
      ...line,
      runningBalance: previous + line.debit - line.credit,
    });
    return acc;
  }, []);

  return (
    <WorkspaceShell title="دفتر کل و گردش حساب" eyebrow="فقط بر پایه اسناد ثبت قطعی">
      <form method="get" className="rounded-3xl border border-slate-200 bg-white p-5">
        <label className="text-xs font-black text-slate-500">حساب</label>
        <div className="mt-2 flex gap-2">
          <select name="accountId" defaultValue={selected?.id ?? ""} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm">
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>{account.code} — {account.name}</option>
            ))}
          </select>
          <button className="rounded-xl bg-[#0f223d] px-4 py-2 text-sm font-black text-white">نمایش گردش</button>
        </div>
      </form>

      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-black">{selected ? `${selected.code} — ${selected.name}` : "بدون حساب"}</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="text-right text-xs text-slate-500">
                <th className="py-3">تاریخ</th>
                <th className="py-3">سند</th>
                <th className="py-3">شرح</th>
                <th className="py-3">بدهکار</th>
                <th className="py-3">بستانکار</th>
                <th className="py-3">مانده</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((line) => (
                <tr key={line.id} className="border-t border-slate-100">
                  <td className="py-3">{line.journal.occurredAt.toLocaleDateString("fa-IR")}</td>
                  <td className="py-3 font-black">{line.journal.number ?? "—"}</td>
                  <td className="py-3">{line.description ?? line.journal.description}</td>
                  <td className="py-3">{money(line.debit)}</td>
                  <td className="py-3">{money(line.credit)}</td>
                  <td className="py-3 font-black">{money(line.runningBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </WorkspaceShell>
  );
}
