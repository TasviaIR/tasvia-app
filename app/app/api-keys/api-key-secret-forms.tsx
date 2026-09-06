"use client";

import { useActionState, useState } from "react";
import {
  createApiKey,
  rotateApiKey,
  type ApiKeyActionState,
} from "./actions";

const initialState: ApiKeyActionState = {
  secret: null,
  error: null,
};

type ScopeOption = {
  value: string;
  label: string;
};

function SecretReveal({ secret }: { secret: string }) {
  const [copied, setCopied] = useState(false);

  async function copySecret() {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
  }

  return (
    <div
      data-testid="api-secret-one-time-reveal"
      className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"
    >
      <div className="text-xs font-black text-amber-900">نمایش یک‌باره Secret</div>
      <p className="mt-1 text-xs leading-6 text-amber-800">
        این مقدار دوباره قابل بازیابی نیست. اکنون آن را در محل امن سرویس مقصد ذخیره کنید.
      </p>
      <code
        dir="ltr"
        className="mt-3 block overflow-x-auto rounded-xl bg-white px-3 py-2 text-xs text-slate-800"
      >
        {secret}
      </code>
      <button
        type="button"
        onClick={copySecret}
        className="mt-3 rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-black"
      >
        {copied ? "کپی شد" : "کپی Secret"}
      </button>
    </div>
  );
}

export function ApiKeyCreateForm({ scopes }: { scopes: ScopeOption[] }) {
  const [state, formAction, pending] = useActionState(createApiKey, initialState);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <h2 className="font-black">کلید جدید</h2>
      <form action={formAction} className="mt-4 space-y-4">
        <input
          name="name"
          required
          maxLength={80}
          placeholder="مثلاً RestYar Production"
          className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"
        />

        <fieldset>
          <legend className="text-xs font-black text-slate-700">سطوح دسترسی</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {scopes.map((scope) => (
              <label
                key={scope.value}
                className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2 text-xs"
              >
                <input
                  type="checkbox"
                  name="scopes"
                  value={scope.value}
                  defaultChecked
                />
                <span>{scope.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <button
          disabled={pending}
          className="w-full rounded-xl bg-[#0f223d] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
        >
          {pending ? "در حال ساخت…" : "ساخت کلید"}
        </button>
      </form>

      {state.error ? (
        <p className="mt-3 text-xs font-bold text-rose-600">{state.error}</p>
      ) : null}
      {state.secret ? <SecretReveal secret={state.secret} /> : null}

      <p className="mt-3 text-xs leading-6 text-slate-400">
        در پایگاه داده فقط SHA-256 کلید نگهداری می‌شود؛ Secret خام در URL یا جدول API Key ذخیره نمی‌شود.
      </p>
    </div>
  );
}

export function ApiKeyRotateForm({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(rotateApiKey, initialState);

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="id" value={id} />
        <button
          disabled={pending}
          className="text-xs font-black text-[#008f87] disabled:opacity-50"
        >
          {pending ? "در حال چرخش…" : "چرخش Secret"}
        </button>
      </form>

      {state.error ? (
        <p className="mt-2 text-xs font-bold text-rose-600">{state.error}</p>
      ) : null}
      {state.secret ? <SecretReveal secret={state.secret} /> : null}
    </div>
  );
}
