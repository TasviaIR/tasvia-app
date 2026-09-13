import { WorkspaceShell } from "../../../../src/components/workspace/shell";
import { requireCurrentWorkspace } from "../../../../src/auth/current-workspace";
import { prisma } from "../../../../src/lib/prisma";

const typeLabel = {
  ASSET: "دارایی",
  LIABILITY: "بدهی",
  EQUITY: "حقوق مالکانه",
  REVENUE: "درآمد",
  EXPENSE: "هزینه",
} as const;

export default async function ChartOfAccountsPage() {
  const current = await requireCurrentWorkspace();

  const accounts = await prisma.accountingAccount.findMany({
    where: { workspaceId: current.workspace.id },
    include: { parent: true, children: true },
    orderBy: [{ code: "asc" }],
  });

  return (
    <WorkspaceShell title="درخت حساب‌ها" eyebrow="کدینگ واقعی و سلسله‌مراتبی حساب‌های فضای کاری">
      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        {accounts.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">هنوز حسابی در این فضای کاری تعریف نشده است.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-sm">
              <thead>
                <tr className="text-right text-xs text-slate-500">
                  <th className="py-3">کد</th>
                  <th className="py-3">نام حساب</th>
                  <th className="py-3">ماهیت</th>
                  <th className="py-3">حساب والد</th>
                  <th className="py-3">زیرحساب</th>
                  <th className="py-3">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id} className="border-t border-slate-100">
                    <td className="py-3 font-black">{account.code}</td>
                    <td className="py-3 font-black text-[#0f223d]">{account.name}</td>
                    <td className="py-3">{typeLabel[account.type]}</td>
                    <td className="py-3">{account.parent ? `${account.parent.code} — ${account.parent.name}` : "ریشه"}</td>
                    <td className="py-3">{new Intl.NumberFormat("fa-IR").format(account.children.length)}</td>
                    <td className="py-3">{account.active ? "فعال" : "غیرفعال"}</td>
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
