import { JalaliDateInput } from "../../src/components/date/jalali-date-input";
import { toJalaliInputValue } from "../../src/lib/tasvin-date";
import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, authConfigured } from "../../src/lib/auth";
import { prisma } from "../../src/lib/prisma";
import { completeBusinessSetupAction, saveBusinessBasicsAction, saveBusinessProfileAction } from "./actions";

export const metadata: Metadata = {
  title: "راه‌اندازی کسب‌وکار | تسوین",
  description: "کسب‌وکار، اطلاعات ثبتی و تنظیمات حسابداری خود را برای شروع ۱۵ روز رایگان تسوین تکمیل کنید.",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ step?: string }> };
const inputClass = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#008f87]";
const primaryButton = "mt-6 min-h-12 w-full rounded-2xl bg-[#0f223d] px-5 py-3 text-sm font-black text-white";
const secondaryButton = "inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black";

export default async function OnboardingPage({ searchParams }: Props) {
  if (!authConfigured) redirect("/sign-in?next=/onboarding");
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect("/sign-in?next=/onboarding");

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { emailVerified: true, phoneVerified: true },
  });
  if (!user.emailVerified || !user.phoneVerified) redirect("/verify");

  const existing = await prisma.membership.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    select: { workspaceId: true },
  });
  if (existing) redirect("/app");

  const draft = await prisma.onboardingDraft.findUnique({ where: { userId: session.user.id } });
  const query = await searchParams;
  const requested = Number(query.step ?? draft?.step ?? 1);
  const step = Math.min(3, Math.max(1, Number.isFinite(requested) ? requested : 1));

  return (
    <main dir="rtl" className="min-h-screen bg-[#f4f7fb] px-4 py-8 text-[#0b1220] sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6">
          <div className="text-xs font-black text-[#008f87]">راه‌اندازی تسوین · مرحله {step} از ۳</div>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">کسب‌وکار حسابداری خود را راه‌اندازی کنید</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#657184]">اطلاعات هر مرحله ذخیره می‌شود. دوره ۱۵ روز رایگان فقط بعد از تکمیل موفق راه‌اندازی شروع می‌شود.</p>
        </header>
        <Progress step={step} />

        {step === 1 ? (
          <form action={saveBusinessBasicsAction} className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
            <section className="rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-7">
              <h2 className="text-xl font-black">کسب‌وکار جدید</h2>
              <p className="mt-2 text-sm leading-7 text-[#657184]">نام کسب‌وکار و زبان پیش‌فرض پنل را مشخص کنید.</p>
              <Field name="businessName" label="نام کسب‌وکار" required defaultValue={draft?.businessName ?? ""} />
              <fieldset className="mt-5">
                <legend className="mb-3 text-xs font-black text-[#4d596b]">زبان پیش‌فرض <Required /></legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <LanguageOption value="FA" title="فارسی" subtitle="راست‌به‌چپ و تقویم شمسی" checked={draft?.defaultLanguage !== "EN"} />
                  <LanguageOption value="EN" title="English" subtitle="LTR interface" checked={draft?.defaultLanguage === "EN"} />
                </div>
              </fieldset>
              <button type="submit" className={primaryButton}>ادامه و ثبت اطلاعات کسب‌وکار</button>
            </section>
            <TutorialCard />
          </form>
        ) : null}

        {step === 2 ? (
          <form action={saveBusinessProfileAction} className="mt-6 rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="text-xl font-black">اطلاعات کسب‌وکار</h2><p className="mt-2 text-sm leading-7 text-[#657184]">موارد ستاره‌دار برای عبور به مرحله بعد الزامی هستند.</p></div>
              <Link href="/onboarding?step=1" className={secondaryButton}>بازگشت</Link>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field name="legalName" label="نام قانونی / رسمی کسب‌وکار" defaultValue={draft?.legalName ?? draft?.businessName ?? ""} required />
              <SelectField name="businessType" label="نوع کسب‌وکار" defaultValue={draft?.businessType ?? ""} required options={[["", "انتخاب کنید"],["COMPANY", "شرکت"],["PERSONAL", "شخص حقیقی / کسب‌وکار شخصی"],["STORE", "فروشگاه"],["SERVICE", "خدماتی"],["MANUFACTURING", "تولیدی"],["OTHER", "سایر"]]} />
              <Field name="activityField" label="زمینه فعالیت" defaultValue={draft?.activityField ?? ""} />
              <Field name="nationalId" label="شناسه ملی" defaultValue={draft?.nationalId ?? ""} />
              <Field name="economicCode" label="کد اقتصادی" defaultValue={draft?.economicCode ?? ""} />
              <Field name="registrationNumber" label="شماره ثبت" defaultValue={draft?.registrationNumber ?? ""} />
              <Field name="country" label="کشور" defaultValue={draft?.country ?? "ایران"} />
              <Field name="province" label="استان" defaultValue={draft?.province ?? ""} />
              <Field name="city" label="شهر" defaultValue={draft?.city ?? ""} />
              <Field name="postalCode" label="کد پستی" defaultValue={draft?.postalCode ?? ""} />
              <Field name="businessPhone" label="تلفن" defaultValue={draft?.businessPhone ?? ""} />
              <Field name="fax" label="فکس" defaultValue={draft?.fax ?? ""} />
              <Field name="website" label="وب‌سایت" defaultValue={draft?.website ?? ""} type="url" />
              <Field name="businessEmail" label="ایمیل کسب‌وکار" defaultValue={draft?.businessEmail ?? ""} type="email" />
            </div>
            <label className="mt-4 block"><span className="mb-2 block text-xs font-black text-[#4d596b]">آدرس</span><textarea name="address" defaultValue={draft?.address ?? ""} rows={3} className={inputClass} /></label>
            <button type="submit" className={primaryButton}>ادامه به تنظیمات حسابداری</button>
          </form>
        ) : null}

        {step === 3 ? (
          <form action={completeBusinessSetupAction} className="mt-6 rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="text-xl font-black">تنظیمات اولیه حسابداری</h2><p className="mt-2 text-sm leading-7 text-[#657184]">این تنظیمات مبنای حسابداری، انبار و سال مالی Workspace شما خواهند بود.</p></div>
              <Link href="/onboarding?step=2" className={secondaryButton}>بازگشت</Link>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <SelectField name="inventoryAccountingSystem" label="سیستم حسابداری موجودی" required defaultValue={draft?.inventoryAccountingSystem ?? "PERPETUAL"} options={[["PERPETUAL", "دائمی"],["PERIODIC", "ادواری"]]} />
              <SelectField name="inventoryValuationMethod" label="روش ارزیابی موجودی" required defaultValue="FIFO" disabled options={[["FIFO", "FIFO — اولین وارده، اولین صادره"]]} />
              <Field name="baseCurrency" label="ارز پایه" required defaultValue={draft?.baseCurrency ?? "IRR"} dir="ltr" />
              <Field name="vatRate" label="نرخ مالیات بر ارزش افزوده (%)" required type="number" min="0" max="100" step="0.01" defaultValue={String((draft?.vatRateBasisPoints ?? 1000) / 100)} dir="ltr" />
              <SelectField name="calendar" label="تقویم" required defaultValue={draft?.calendar ?? "SOLAR_HIJRI"} options={[["SOLAR_HIJRI", "هجری شمسی"],["GREGORIAN", "میلادی"]]} />
              <Field name="fiscalYearTitle" label="عنوان سال مالی" required defaultValue={draft?.fiscalYearTitle ?? "سال مالی جاری"} />
              <label className="grid gap-2 text-sm font-bold">شروع سال مالی<JalaliDateInput name="fiscalYearStartsAt" required defaultValue={draft?.fiscalYearStartsAt ? toJalaliInputValue(draft.fiscalYearStartsAt) : ""} className="input" /></label>
              <label className="grid gap-2 text-sm font-bold">پایان سال مالی<JalaliDateInput name="fiscalYearEndsAt" required defaultValue={draft?.fiscalYearEndsAt ? toJalaliInputValue(draft.fiscalYearEndsAt) : ""} className="input" /></label>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <Toggle name="inventoryEnabled" title="سیستم انبار" description="مدیریت کالا، موجودی و گردش انبار" defaultChecked={draft?.inventoryEnabled ?? true} />
              <Toggle name="manufacturingEnabled" title="تولید" description="BOM و فرایندهای تولیدی" defaultChecked={draft?.manufacturingEnabled ?? false} />
              <Toggle name="multiCurrencyEnabled" title="چندارزی" description="ثبت نرخ و عملیات ارزی" defaultChecked={draft?.multiCurrencyEnabled ?? false} />
            </div>
            <div className="mt-6 rounded-2xl bg-[#eef9f8] p-4 text-xs leading-6 text-[#35615e]">با تکمیل این مرحله، Workspace، عضویت OWNER، تنظیمات حسابداری، سال مالی و دوره ۱۵ روز رایگان در یک تراکنش ساخته می‌شوند.</div>
            <button type="submit" className={primaryButton}>تکمیل راه‌اندازی و ورود به تسوین</button>
          </form>
        ) : null}
      </div>
    </main>
  );
}

function Required() { return <span className="mr-1 text-red-500">*</span>; }
function Progress({ step }: { step: number }) { return <div className="grid grid-cols-3 gap-2">{["کسب‌وکار","اطلاعات","حسابداری"].map((item,index) => { const n=index+1; const active=n<=step; return <div key={item} className={`rounded-2xl border px-3 py-3 text-center text-xs font-black ${active ? "border-[#008f87]/20 bg-[#eafaf8] text-[#176b66]" : "border-slate-200 bg-white text-slate-400"}`}>{n}. {item}</div>; })}</div>; }
function TutorialCard() { return <aside className="rounded-[30px] bg-[#0f223d] p-5 text-white shadow-sm sm:p-6"><div className="text-xs font-black text-[#64d9cf]">راهنمای سریع</div><h2 className="mt-2 text-xl font-black">چگونه یک کسب‌وکار جدید در تسوین معرفی کنیم؟</h2><div className="mt-5 aspect-video rounded-2xl border border-white/10 bg-white/5 p-5"><div className="flex h-full flex-col items-center justify-center text-center"><div className="flex size-14 items-center justify-center rounded-full bg-[#00a99d] text-xl">▶</div><div className="mt-3 text-sm font-black">ویدئوی راه‌اندازی تسوین</div><p className="mt-2 text-xs leading-6 text-white/60">جایگاه ویدئوی راهنمای رسمی تسوین؛ متن راهنما نیز برای دسترس‌پذیری باقی می‌ماند.</p></div></div><ol className="mt-5 space-y-3 text-xs leading-6 text-white/75"><li>۱. نام و زبان کسب‌وکار را تعیین کنید.</li><li>۲. اطلاعات ثبتی و تماس را تکمیل کنید.</li><li>۳. تنظیمات حسابداری و سال مالی را مشخص کنید.</li></ol></aside>; }
function LanguageOption(props:{value:"FA"|"EN";title:string;subtitle:string;checked:boolean}) { return <label className="cursor-pointer rounded-2xl border border-slate-200 p-4"><div className="flex items-start gap-3"><input type="radio" name="defaultLanguage" value={props.value} defaultChecked={props.checked} required className="mt-1"/><div><div className="text-sm font-black">{props.title}</div><div className="mt-1 text-xs text-[#657184]">{props.subtitle}</div></div></div></label>; }
function Field(props:{name:string;label:string;defaultValue?:string;required?:boolean;type?:string;min?:string;max?:string;step?:string;dir?:"ltr"|"rtl"}) { return <label className="mt-4 block"><span className="mb-2 block text-xs font-black text-[#4d596b]">{props.label}{props.required ? <Required/> : null}</span><input name={props.name} defaultValue={props.defaultValue} required={props.required} type={props.type ?? "text"} min={props.min} max={props.max} step={props.step} dir={props.dir} className={inputClass}/></label>; }
function SelectField(props:{name:string;label:string;defaultValue:string;required?:boolean;disabled?:boolean;options:Array<[string,string]>}) { return <label className="block"><span className="mb-2 block text-xs font-black text-[#4d596b]">{props.label}{props.required ? <Required/> : null}</span><select name={props.name} defaultValue={props.defaultValue} required={props.required} disabled={props.disabled} className={inputClass}>{props.options.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>{props.disabled ? <input type="hidden" name={props.name} value={props.defaultValue}/> : null}</label>; }
function Toggle(props:{name:string;title:string;description:string;defaultChecked:boolean}) { return <label className="flex cursor-pointer gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"><input type="checkbox" name={props.name} defaultChecked={props.defaultChecked} className="mt-1 size-4"/><span><span className="block text-sm font-black">{props.title}</span><span className="mt-1 block text-xs leading-6 text-[#657184]">{props.description}</span></span></label>; }
