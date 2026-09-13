import { WorkspaceShell } from "../../../src/components/workspace/shell";
import { requireCurrentWorkspace } from "../../../src/auth/current-workspace";
import { prisma } from "../../../src/lib/prisma";
import { listManufacturing } from "../../../src/application/manufacturing/manufacturing-service";
import {
  completeManufacturingOrderAction,
  createBomAction,
  createManufacturingOrderAction,
} from "../operations-controls/actions-wave3";

const input="rounded-xl border border-slate-200 px-3 py-2 text-sm";
const btn="rounded-xl bg-[#102845] px-4 py-2.5 text-xs font-black text-white";

export default async function ManufacturingPage(){
  const current=await requireCurrentWorkspace();
  const [state,items,warehouses]=await Promise.all([
    listManufacturing(current.workspace.id),
    prisma.catalogItem.findMany({where:{workspaceId:current.workspace.id,type:"STOCK_ITEM",active:true},orderBy:{name:"asc"}}),
    prisma.warehouse.findMany({where:{workspaceId:current.workspace.id,active:true},orderBy:{name:"asc"}}),
  ]);

  return <WorkspaceShell title="تولید و بهای تمام‌شده" eyebrow="BOM، دستور تولید، مصرف مواد، محصول نهایی و بهای دقیق">
    <section className="grid gap-5 xl:grid-cols-2">
      <article className="rounded-3xl border bg-white p-5">
        <h2 className="font-black">فرمول ساخت جدید</h2>
        <form action={createBomAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input name="code" required placeholder="BOM-001" className={input}/>
          <input name="name" required placeholder="فرمول محصول" className={input}/>
          <select name="outputItemId" required className={input}><option value="">محصول نهایی</option>{items.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <input name="outputQuantity" type="number" min="1" defaultValue="1" className={input}/>
          <select name="componentItemId" required className={input}><option value="">ماده اولیه</option>{items.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <input name="componentQuantity" type="number" min="1" defaultValue="1" className={input}/>
          <input name="wasteBasisPoints" type="number" min="0" max="10000" defaultValue="0" className={input}/>
          <button className={btn}>ثبت BOM</button>
        </form>
        <p className="mt-3 text-xs text-slate-500">{state.boms.length} فرمول ثبت شده</p>
      </article>

      <article className="rounded-3xl border bg-white p-5">
        <h2 className="font-black">دستور تولید</h2>
        <form action={createManufacturingOrderAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <select name="bomId" required className={input}><option value="">انتخاب BOM</option>{state.boms.map(x=><option key={x.id} value={x.id}>{x.code} — {x.name}</option>)}</select>
          <select name="warehouseId" required className={input}><option value="">انبار</option>{warehouses.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <input name="orderNumber" required placeholder="MO-001" className={input}/>
          <input name="plannedOutputQuantity" type="number" min="1" defaultValue="1" className={input}/>
          <input name="laborCost" type="number" min="0" defaultValue="0" placeholder="دستمزد" className={input}/>
          <input name="overheadCost" type="number" min="0" defaultValue="0" placeholder="سربار" className={input}/>
          <button className={btn}>ایجاد دستور</button>
        </form>
      </article>
    </section>

    <section className="mt-5 space-y-3">
      {state.orders.map(order=><article key={order.id} className="rounded-2xl border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><b>{order.orderNumber}</b><div className="mt-1 text-xs text-slate-500">{order.status}</div></div>
          {order.status!=="COMPLETED"?<form action={completeManufacturingOrderAction} className="flex gap-2">
            <input type="hidden" name="orderId" value={order.id}/>
            <input name="actualOutputQuantity" type="number" min="1" defaultValue={order.plannedOutputQuantity.toString()} className={input}/>
            <button className={btn}>تکمیل تولید</button>
          </form>:<div className="text-xs font-black text-emerald-700">تکمیل شده · بهای مواد {order.materialCost?.toString()??"0"} ریال</div>}
        </div>
      </article>)}
    </section>
  </WorkspaceShell>
}
