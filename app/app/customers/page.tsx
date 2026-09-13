import Link from "next/link";
import { WorkspaceShell } from "../../../src/components/workspace/shell";
import { CounterpartyCenter } from "../../../src/components/counterparties/counterparty-center";
import { requireCurrentWorkspace } from "../../../src/auth/current-workspace";
import { getCounterpartyCenter } from "../../../src/application/counterparties/counterparty-center-service";

export default async function CustomersPage() {
  const current = await requireCurrentWorkspace();
  const center = await getCounterpartyCenter(current.workspace.id, "CUSTOMER");
  return (
    <WorkspaceShell title="مشتریان" eyebrow="فروش، مطالبات و وصول"
      actions={<Link href="/app/sales" className="rounded-xl bg-[#0f223d] px-4 py-2.5 text-xs font-black text-white">فاکتور فروش +</Link>}>
      <CounterpartyCenter kind="CUSTOMER" {...center} />
    </WorkspaceShell>
  );
}
