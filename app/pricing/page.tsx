import Link from "next/link";
import { cyclePrice, plans } from "../../src/domain/subscription/plans";
const toman=(n:number)=>new Intl.NumberFormat("fa-IR").format(n);
export default function PricingPage(){
 return <main dir="rtl" className="min-h-screen bg-[#f5f7fa] px-4 py-16 text-[#0f223d]">
  <div className="mx-auto max-w-7xl">
   <div className="text-center"><p className="font-black text-[#008f87]">۱۵ روز رایگان</p><h1 className="mt-3 text-4xl font-black">پلن مناسب کسب‌وکار شما</h1><p className="mt-3 text-slate-500">بدون حذف اطلاعات پس از پایان دوره آزمایشی؛ ارتقا در هر زمان.</p></div>
   <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-5">{plans.map(p=><article key={p.code} className="rounded-3xl border border-slate-200 bg-white p-6">
    <h2 className="text-xl font-black">{p.name}</h2><div className="mt-4 text-2xl font-black text-[#008f87]">{toman(p.monthlyToman)} <span className="text-xs">تومان/ماه</span></div>
    <p className="mt-4 text-sm text-slate-500">{p.documentLimit?`${p.documentLimit} سند ماهانه`:"اسناد نامحدود"} · کاربران نامحدود · API</p>
    <p className="mt-3 text-xs text-slate-400">۶ ماهه با ۱۰٪ تخفیف: {toman(cyclePrice(p.monthlyToman,"SEMIANNUAL"))}</p>
    <p className="mt-1 text-xs text-slate-400">سالانه با ۲۰٪ تخفیف: {toman(cyclePrice(p.monthlyToman,"ANNUAL"))}</p>
    <Link href="/onboarding" className="mt-6 block rounded-xl bg-[#0f223d] px-4 py-3 text-center text-sm font-black text-white">شروع ۱۵ روز رایگان</Link>
   </article>)}</div>
  </div>
 </main>
}
