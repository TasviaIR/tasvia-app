import Link from "next/link";
import { WorkspaceShell } from "../../../src/components/workspace/shell";
import { requireCurrentWorkspace } from "../../../src/auth/current-workspace";
import { prisma } from "../../../src/lib/prisma";

export default async function PlatformControlsPage() {
  const current = await requireCurrentWorkspace();

  const [apiKeys, members, auditEvents] = await Promise.all([
    prisma.apiKey.count({ where: { workspaceId: current.workspace.id, revokedAt: null } }),
    prisma.membership.count({ where: { workspaceId: current.workspace.id, status: "ACTIVE" } }),
    prisma.auditEvent.count({ where: { workspaceId: current.workspace.id } }),
  ]);

  const modules = [
    ["/app/api-keys", "API و کلیدهای دسترسی", `${apiKeys} کلید فعال`, "Scope، Rotate، Revoke، Rate Limit و Audit"],
    ["/developers", "مستندات توسعه‌دهندگان", "API V1", "قراردادهای اتصال و مسیرهای Read API"],
    ["/app/audit", "امنیت و Audit", `${auditEvents} رویداد`, "ردپای غیرقابل‌تغییر عملیات حساس"],
    ["/app/subscription", "اشتراک و Entitlement", "کنترل دسترسی", "Trial و قفل مرکزی عملیات مالی"],
    ["/app", "اعضای Workspace", `${members} عضو فعال`, "Workspace isolation و Role context"],
    ["/app/reconciliation", "اتصال بانکی امن", "Sandbox-first", "هیچ Provider عملیاتی بدون مجوز Production فعال نمی‌شود"],
  ] as const;

  return (
    <WorkspaceShell title="تنظیمات، امنیت و اتصال" eyebrow="API، دسترسی، اشتراک، Audit و مرز اتصال سرویس‌ها">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {modules.map(([href,title,value,description]) => (
          <Link key={href} href={href} className="rounded-3xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#008f87]/40">
            <div className="text-xs font-black text-[#008f87]">{value}</div>
            <h2 className="mt-2 text-lg font-black text-[#0f223d]">{title}</h2>
            <p className="mt-3 text-xs leading-6 text-slate-500">{description}</p>
            <div className="mt-5 text-xs font-black text-[#00776f]">ورود ←</div>
          </Link>
        ))}
      </section>
    </WorkspaceShell>
  );
}
