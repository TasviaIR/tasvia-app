const endpoints=[
 ["GET","/api/v1/customers","customers:read"],["GET","/api/v1/suppliers","suppliers:read"],
 ["GET","/api/v1/sales","sales:read"],["GET","/api/v1/purchases","purchases:read"],
 ["GET","/api/v1/inventory","inventory:read"],["GET","/api/v1/treasury","treasury:read"],
 ["GET","/api/v1/reports/summary","reports:read"]
];
export default function DevelopersPage(){return <main dir="rtl" className="min-h-screen bg-[#f5f7fa] px-4 py-16 text-[#0f223d]"><div className="mx-auto max-w-5xl">
 <p className="font-black text-[#008f87]">Tasvin API v1</p><h1 className="mt-2 text-4xl font-black">پلتفرم توسعه‌دهندگان تسوین</h1>
 <p className="mt-4 max-w-3xl text-slate-500">API نسخه‌بندی‌شده و Workspace-scoped برای اتصال رست‌یار و سامانه‌های خارجی. احراز هویت با Bearer API Key و Scope انجام می‌شود.</p>
 <pre dir="ltr" className="mt-7 overflow-x-auto rounded-2xl bg-[#0f223d] p-5 text-sm text-white">Authorization: Bearer tv_live_...</pre>
 <div className="mt-8 overflow-x-auto rounded-3xl border bg-white p-5"><table className="w-full text-sm"><thead><tr><th>Method</th><th>Endpoint</th><th>Scope</th></tr></thead><tbody>{endpoints.map(e=><tr key={e[1]}><td dir="ltr">{e[0]}</td><td dir="ltr">{e[1]}</td><td dir="ltr">{e[2]}</td></tr>)}</tbody></table></div>
 <section className="mt-7 rounded-3xl border bg-white p-6"><h2 className="text-xl font-black">قرارداد امنیتی V1</h2><p className="mt-3 text-sm leading-7 text-slate-500">کلیدها قابل لغو هستند، فقط هش Secret ذخیره می‌شود، هر درخواست به Workspace همان کلید محدود است و V1 در این مرحله فقط خواندنی است. عملیات مالی نوشتنی تا تکمیل idempotency و کنترل‌های مالی API فعال نمی‌شود.</p></section>
 </div></main>}
