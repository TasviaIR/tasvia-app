import { WorkspaceShell } from "../../../src/components/workspace/shell";
import { requireCurrentWorkspace } from "../../../src/auth/current-workspace";
import { prisma } from "../../../src/lib/prisma";
import { listTaxSubmissions } from "../../../src/application/tax/tax-submission-service";
import { queueModianAction } from "../operations-controls/actions-wave3";

const input="rounded-xl border border-slate-200 px-3 py-2 text-sm";

export default async function TaxPage(){
  const current=await requireCurrentWorkspace();
  const [submissions,invoices]=await Promise.all([
    listTaxSubmissions(current.workspace.id),
    prisma.salesInvoice.findMany({
      where:{workspaceId:current.workspace.id,status:{in:["POSTED","PAID"]}},
      orderBy:{issuedAt:"desc"},
      take:100,
    }),
  ]);

  return <WorkspaceShell title="مالیات و سامانه مودیان" eyebrow="صف امن صورتحساب الکترونیکی، idempotency، هش payload و وضعیت پذیرش">
    <section className="rounded-3xl border bg-white p-5">
      <h2 className="font-black">افزودن فاکتور به صف مودیان</h2>
      <form action={queueModianAction} className="mt-4 grid gap-3 md:grid-cols-3">
        <select name="salesInvoiceId" required className={input}><option value="">فاکتور فروش قطعی</option>{invoices.map(x=><option key={x.id} value={x.id}>{x.invoiceNumber} — {x.total.toString()} ریال</option>)}</select>
        <input name="taxpayerId" placeholder="شناسه/کد ملی خریدار" className={input}/>
        <button className="rounded-xl bg-[#102845] px-4 py-2.5 text-xs font-black text-white">افزودن به صف</button>
      </form>
      <p className="mt-3 text-xs text-amber-700">ارسال واقعی به Provider فقط بعد از Credential معتبر و مجوز Production فعال می‌شود؛ صف و Audit در محصول کامل است.</p>
    </section>

    <section className="mt-5 overflow-x-auto rounded-3xl border bg-white p-5">
      <table className="w-full min-w-[850px] text-sm"><thead><tr className="text-right text-xs text-slate-500"><th className="py-3">فاکتور</th><th>وضعیت</th><th>هش</th><th>مرجع Provider</th><th>تاریخ</th></tr></thead>
      <tbody>{submissions.map(x=><tr key={x.id} className="border-t"><td className="py-3 font-black">{x.invoiceNumber}</td><td>{x.status}</td><td dir="ltr" className="font-mono text-xs">{x.payloadHash.slice(0,16)}…</td><td>{x.providerReference??"—"}</td><td>{x.createdAt.toLocaleDateString("fa-IR")}</td></tr>)}</tbody></table>
    </section>
  </WorkspaceShell>
}
