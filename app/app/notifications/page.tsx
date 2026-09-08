import { WorkspaceShell } from "../../../src/components/workspace/shell";
import { requireCurrentWorkspace } from "../../../src/auth/current-workspace";
import { listNotifications } from "../../../src/application/notifications/notification-service";
import {
  createNotificationTemplateAction,
  queueNotificationAction,
} from "../operations-controls/actions-wave3";

const input="rounded-xl border border-slate-200 px-3 py-2 text-sm";
const btn="rounded-xl bg-[#102845] px-4 py-2.5 text-xs font-black text-white";

export default async function NotificationsPage(){
  const current=await requireCurrentWorkspace();
  const state=await listNotifications(current.workspace.id);

  return <WorkspaceShell title="اعلان، پیامک و اتوماسیون" eyebrow="Template، صف idempotent، زمان‌بندی و Provider-safe delivery">
    <section className="grid gap-5 xl:grid-cols-2">
      <article className="rounded-3xl border bg-white p-5">
        <h2 className="font-black">قالب اعلان</h2>
        <form action={createNotificationTemplateAction} className="mt-4 grid gap-3">
          <div className="grid gap-3 md:grid-cols-2"><input name="code" required placeholder="CHEQUE_DUE" className={input}/><input name="name" required placeholder="سررسید چک" className={input}/></div>
          <div className="grid gap-3 md:grid-cols-2"><select name="channel" className={input}><option>SMS</option><option>EMAIL</option><option>IN_APP</option></select><input name="subject" placeholder="عنوان" className={input}/></div>
          <textarea name="body" required placeholder="متن پیام" className={input}/>
          <button className={btn}>ایجاد قالب</button>
        </form>
        <p className="mt-3 text-xs text-slate-500">{state.templates.length} قالب ثبت شده</p>
      </article>

      <article className="rounded-3xl border bg-white p-5">
        <h2 className="font-black">ارسال/زمان‌بندی</h2>
        <form action={queueNotificationAction} className="mt-4 grid gap-3">
          <div className="grid gap-3 md:grid-cols-2"><select name="channel" className={input}><option>SMS</option><option>EMAIL</option><option>IN_APP</option></select><input name="recipient" required placeholder="گیرنده" className={input}/></div>
          <input name="subject" placeholder="عنوان" className={input}/>
          <textarea name="body" required placeholder="متن پیام" className={input}/>
          <input name="idempotencyKey" required placeholder="reminder:cheque:123:2026-09-07" className={input}/>
          <button className={btn}>قرار دادن در صف</button>
        </form>
      </article>
    </section>

    <section className="mt-5 space-y-2">{state.queue.map(x=><article key={x.id} className="rounded-2xl border bg-white p-4"><div className="flex justify-between gap-3"><b>{x.channel} → {x.recipient}</b><span className="text-xs font-black">{x.status}</span></div><p className="mt-2 text-xs text-slate-500">{x.body}</p></article>)}</section>
  </WorkspaceShell>
}
