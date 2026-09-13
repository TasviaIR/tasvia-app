import Link from "next/link";
import { WorkspaceShell } from "../../../src/components/workspace/shell";
import { requireCurrentWorkspace } from "../../../src/auth/current-workspace";
import { prisma } from "../../../src/lib/prisma";
import { API_SCOPES } from "../../../src/application/api-platform/api-contract";
import { revokeApiKey } from "./actions";
import { ApiKeyCreateForm, ApiKeyRotateForm } from "./api-key-secret-forms";

const scopeLabels: Record<(typeof API_SCOPES)[number], string> = {
  "customers:read": "خواندن مشتریان",
  "suppliers:read": "خواندن تأمین‌کنندگان",
  "sales:read": "خواندن فروش",
  "purchases:read": "خواندن خرید",
  "inventory:read": "خواندن موجودی",
  "treasury:read": "خواندن خزانه",
  "reports:read": "خواندن گزارش‌ها",
};

export default async function ApiKeysPage() {
  const current = await requireCurrentWorkspace();
  const keys = await prisma.apiKey.findMany({
    where: { workspaceId: current.workspace.id },
    orderBy: { createdAt: "desc" },
  });

  const scopes = API_SCOPES.map((value) => ({
    value,
    label: scopeLabels[value],
  }));

  return (
    <WorkspaceShell title="کلیدهای API" eyebrow="اتصال امن رست‌یار و سامانه‌های خارجی">
      <div className="grid gap-5 xl:grid-cols-[minmax(320px,1fr)_2fr]">
        <ApiKeyCreateForm scopes={scopes} />

        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-black">کلیدها</h2>
            <Link href="/developers" className="text-sm font-bold text-[#008f87]">
              مستندات API
            </Link>
          </div>

          {keys.length === 0 ? (
            <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
              هنوز کلید API ساخته نشده است.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr>
                    <th className="py-3 text-right">نام</th>
                    <th className="py-3 text-right">شناسه</th>
                    <th className="py-3 text-right">Scopeها</th>
                    <th className="py-3 text-right">آخرین استفاده</th>
                    <th className="py-3 text-right">وضعیت</th>
                    <th className="py-3 text-right">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((key) => (
                    <tr key={key.id} className="border-t border-slate-100 align-top">
                      <td className="py-4">{key.name}</td>
                      <td className="py-4" dir="ltr">tv_live_{key.prefix}…</td>
                      <td className="py-4">
                        <div className="flex max-w-sm flex-wrap gap-1.5">
                          {key.scopes.map((scope) => (
                            <span
                              key={scope}
                              className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600"
                            >
                              {scopeLabels[scope as keyof typeof scopeLabels] ?? scope}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4">
                        {key.lastUsedAt?.toLocaleString("fa-IR") ?? "—"}
                      </td>
                      <td className="py-4">{key.revokedAt ? "لغوشده" : "فعال"}</td>
                      <td className="py-4">
                        {!key.revokedAt ? (
                          <div className="space-y-3">
                            <ApiKeyRotateForm id={key.id} />
                            <form action={revokeApiKey}>
                              <input type="hidden" name="id" value={key.id} />
                              <button className="text-xs font-black text-rose-600">
                                لغو کلید
                              </button>
                            </form>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">بدون عملیات</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
