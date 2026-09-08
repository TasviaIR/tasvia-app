"use client";

import { useActionState } from "react";
import {
  commitCounterpartyImportAction,
  previewCounterpartyImport,
} from "./actions";

const initialState = {
  ok: false,
  message: "",
};

export function CounterpartyImportForm() {
  const [preview, previewAction, previewPending] = useActionState(
    previewCounterpartyImport,
    initialState,
  );

  const [commit, commitAction, commitPending] = useActionState(
    commitCounterpartyImportAction,
    initialState,
  );

  return (
    <div className="space-y-5">
      <form action={previewAction} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-black text-[#0f223d]">
            فایل CSV مشتریان و تأمین‌کنندگان
          </label>
          <input
            type="file"
            name="file"
            accept=".csv,text/csv"
            required
            className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          />
          <p className="mt-2 text-xs leading-6 text-slate-500">
            ستون‌های الزامی: type و name. مقدار type یکی از CUSTOMER،
            SUPPLIER یا BOTH باشد.
          </p>
        </div>

        <button
          type="submit"
          disabled={previewPending}
          className="rounded-2xl bg-[#0f223d] px-5 py-3 text-sm font-black text-white disabled:opacity-50"
        >
          {previewPending ? "در حال بررسی…" : "Dry Run و بررسی فایل"}
        </button>
      </form>

      {preview.message ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-bold text-[#0f223d]">
            {preview.message}
          </p>

          {typeof preview.acceptedRows === "number" ? (
            <p className="mt-2 text-xs text-slate-500">
              معتبر: {preview.acceptedRows} | خطادار: {preview.rejectedRows ?? 0}
            </p>
          ) : null}

          {preview.errors?.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="p-2">ردیف</th>
                    <th className="p-2">فیلد</th>
                    <th className="p-2">خطا</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.errors.slice(0, 100).map((error, index) => (
                    <tr key={`${error.row}-${error.field}-${index}`}>
                      <td className="p-2">{error.row}</td>
                      <td className="p-2">{error.field ?? "—"}</td>
                      <td className="p-2">{error.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

      {preview.ok && preview.jobId && preview.sourceContent ? (
        <form action={commitAction}>
          <input type="hidden" name="jobId" value={preview.jobId} />
          <input
            type="hidden"
            name="sourceContent"
            value={preview.sourceContent}
          />

          <button
            type="submit"
            disabled={commitPending}
            className="rounded-2xl bg-[#008f87] px-5 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            {commitPending ? "در حال ثبت…" : "تأیید و ورود واقعی اطلاعات"}
          </button>
        </form>
      ) : null}

      {commit.message ? (
        <div className="rounded-2xl border border-[#008f87]/20 bg-[#008f87]/5 p-4 text-sm font-bold text-[#006d67]">
          {commit.message}
        </div>
      ) : null}
    </div>
  );
}
