import Link from "next/link";
import { WorkspaceShell } from "../../../src/components/workspace/shell";
import { CounterpartyCenter } from "../../../src/components/counterparties/counterparty-center";
import { requireCurrentWorkspace } from "../../../src/auth/current-workspace";
import { getCounterpartyCenter } from "../../../src/application/counterparties/counterparty-center-service";

export default async function SuppliersPage() {
  const current = await requireCurrentWorkspace();
  const center = await getCounterpartyCenter(current.workspace.id, "SUPPLIER");
  return (
    <WorkspaceShell title="تأمین‌کنندگان" eyebrow="خرید، بدهی و پرداخت"
      actions={<Link href="/app/purchases" className="rounded-xl bg-[#0f223d] px-4 py-2.5 text-xs font-black text-white">ثبت خرید +</Link>}>
      <CounterpartyCenter kind="SUPPLIER" {...center} />
    </WorkspaceShell>
  );
}
