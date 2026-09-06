import type { AccountingDimensionType } from "@prisma/client";
import Link from "next/link";
import { WorkspaceShell } from "../../../src/components/workspace/shell";
import { requireCurrentWorkspace } from "../../../src/auth/current-workspace";
import { listDimensionValues } from "../../../src/application/accounting/dimension-service";
import {
  createDimensionAction,
  setDimensionActiveAction,
} from "./actions";

const sections: Array<{
  type: AccountingDimensionType;
  title: string;
  description: string;
}> = [
  {
    type: "BRANCH",
    title: "شعب",
    description: "تفکیک عملکرد مالی شعب و نقاط عملیاتی.",
  },
  {
    type: "COST_CENTER",
    title: "مراکز هزینه",
    description: "کنترل هزینه‌ها بر اساس واحد، تیم یا فعالیت.",
  },
  {
    type: "PROJECT",
    title: "پروژه‌ها",
    description: "پایش درآمد، هزینه و سودآوری پروژه‌ها.",
  },
];

export default async function DimensionsPage() {
  const current = await requireCurrentWorkspace();
  const values = await listDimensionValues(current.workspace.id);
  const canManage = current.role !== "VIEWER";

  return (
    <WorkspaceShell
      title="شعب و ابعاد مالی"
      eyebrow="ساختار مدیریتی برای گزارش‌گیری شعب، مراکز هزینه و پروژه‌ها"
    >
      <div className="mb-5">
        <Link
          href="/app/dimensions/assignments"
          className="inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-[#008f87]"
        >
          تخصیص ابعاد به اسناد حسابداری
        </Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {sections.map((section) => {
          const rows = values.filter((item) => item.type === section.type);

          return (
            <section
              key={section.type}
              className="rounded-3xl border border-slate-200 bg-white p-5"
            >
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  {section.title}
                </h2>
                <p className="mt-1 text-xs leading-6 text-slate-500">
                  {section.description}
                </p>
              </div>

              {canManage ? (
                <form action={createDimensionAction} className="mt-5 grid gap-3">
                  <input type="hidden" name="type" value={section.type} />
                  <input
                    name="code"
                    required
                    maxLength={40}
                    dir="ltr"
                    placeholder="CODE"
                    className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  />
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={120}
                    placeholder={`نام ${section.title}`}
                    className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  />
                  <button className="rounded-xl bg-[#0f223d] px-4 py-2.5 text-xs font-black text-white">
                    افزودن
                  </button>
                </form>
              ) : (
                <div className="mt-5 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                  دسترسی شما فقط‌خواندنی است.
                </div>
              )}

              {rows.length === 0 ? (
                <div
                  data-testid={`dimension-empty-${section.type.toLowerCase()}`}
                  className="mt-5 rounded-2xl bg-slate-50 p-4 text-xs leading-6 text-slate-500"
                >
                  هنوز موردی ثبت نشده است.
                </div>
              ) : (
                <div className="mt-5 space-y-2">
                  {rows.map((row) => (
                    <article
                      key={row.id}
                      className="rounded-2xl border border-slate-100 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-black text-slate-800">
                            {row.name}
                          </div>
                          <div dir="ltr" className="mt-1 text-[11px] text-slate-400">
                            {row.code}
                          </div>
                        </div>
                        <span
                          className={`rounded-lg px-2 py-1 text-[10px] font-black ${
                            row.active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {row.active ? "فعال" : "غیرفعال"}
                        </span>
                      </div>

                      {canManage ? (
                        <form action={setDimensionActiveAction} className="mt-3">
                          <input type="hidden" name="id" value={row.id} />
                          <input
                            type="hidden"
                            name="active"
                            value={row.active ? "false" : "true"}
                          />
                          <button className="text-xs font-black text-[#008f87]">
                            {row.active ? "غیرفعال‌کردن" : "فعال‌کردن"}
                          </button>
                        </form>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </WorkspaceShell>
  );
}
