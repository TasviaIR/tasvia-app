import { WorkspaceShell } from "../../../src/components/workspace/shell";
import { requireCurrentWorkspace } from "../../../src/auth/current-workspace";
import { prisma } from "../../../src/lib/prisma";
import { cyclePrice, plans, trialDaysRemaining } from "../../../src/domain/subscription/plans";

const toman=(n:number)=>`${new Intl.NumberFormat("fa-IR").format(n)} تومان`;
export default async function SubscriptionPage(){
 const current=await requireCurrentWorkspace();
 const sub=await prisma.workspaceSubscription.findUnique({where:{workspaceId:current.workspace.id}});
 const days=sub?trialDaysRemaining(sub.trialEndsAt):15;
 return <WorkspaceShell title="اشتراک تسوین" eyebrow="۱۵ روز استفاده رایگان؛ اطلاعات شما حفظ می‌شود">
  <section className="rounded-3xl bg-[#0f223d] p-6 text-white">
   <div className="text-sm text-[#55e1d6]">وضعیت اشتراک</div>
   <div className="mt-2 text-2xl font-black">{sub?.status==="ACTIVE"?"فعال":`${days} روز از دوره آزمایشی باقی مانده`}</div>
   <p className="mt-2 text-sm text-white/60">پس از پایان دمو، اطلاعات حذف نمی‌شوند و محیط کاری تا فعال‌سازی اشتراک در حالت فقط‌خواندنی باقی می‌ماند.</p>
  </section>
  <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
   {plans.map(p=><article key={p.code} className="rounded-3xl border border-slate-200 bg-white p-5">
    <h2 className="text-lg font-black text-[#0f223d]">{p.name}</h2>
    <div className="mt-3 text-xl font-black text-[#008f87]">{toman(p.monthlyToman)}</div>
    <div className="text-xs text-slate-400">ماهانه</div>
    <ul className="mt-4 space-y-2 text-xs text-slate-600">
     <li>کاربر نامحدود</li><li>API تسوین</li><li>{p.documentLimit?`${p.documentLimit} سند در ماه`:"اسناد نامحدود"}</li>
     <li>شش‌ماهه: {toman(cyclePrice(p.monthlyToman,"SEMIANNUAL"))}</li>
     <li>سالانه: {toman(cyclePrice(p.monthlyToman,"ANNUAL"))}</li>
    </ul>
    <button disabled className="mt-5 w-full rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-black text-slate-500">فعال‌سازی پس از اتصال پرداخت</button>
   </article>)}
  </div>
 </WorkspaceShell>
}
