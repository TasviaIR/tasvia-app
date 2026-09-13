"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentWorkspace } from "../../../src/auth/current-workspace";
import {
  mapCounterpartyImportRows,
  parseCsv,
} from "../../../src/application/data-portability/counterparty-csv";
import {
  createDryRunImportJob,
} from "../../../src/application/data-portability/import-job-service";
import {
  commitCounterpartyImport,
} from "../../../src/application/data-portability/counterparty-import-service";

type ActionState = {
  ok: boolean;
  message: string;
  jobId?: string;
  sourceContent?: string;
  acceptedRows?: number;
  rejectedRows?: number;
  errors?: Array<{
    row: number;
    field?: string;
    code: string;
    message: string;
  }>;
};

function canWrite(role: string) {
  return role === "OWNER" || role === "ADMIN" || role === "FINANCE";
}

export async function previewCounterpartyImport(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const current = await requireCurrentWorkspace();

  if (!canWrite(current.role)) {
    return {
      ok: false,
      message: "برای ورود اطلاعات دسترسی کافی ندارید.",
    };
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return {
      ok: false,
      message: "فایل CSV انتخاب نشده است.",
    };
  }

  if (
    file.type &&
    file.type !== "text/csv" &&
    file.type !== "application/vnd.ms-excel"
  ) {
    return {
      ok: false,
      message: "فقط فایل CSV مجاز است.",
    };
  }

  const sourceContent = await file.text();

  let parsed;
  try {
    parsed = parseCsv(sourceContent);
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? `ساختار CSV معتبر نیست: ${error.message}`
          : "ساختار CSV معتبر نیست.",
    };
  }

  const result = mapCounterpartyImportRows(parsed);

  const job = await createDryRunImportJob({
    workspaceId: current.workspace.id,
    actorId: current.userId,
    actorRole: current.role,
    entityType: "COUNTERPARTY",
    filename: file.name,
    sourceContent,
    totalRows: parsed.rows.length,
    acceptedRows: result.rows.length,
    rejectedRows: parsed.rows.length - result.rows.length,
    errorReport: result.errors,
  });

  revalidatePath("/app/data-portability");

  return {
    ok: result.errors.length === 0,
    message:
      result.errors.length === 0
        ? `${result.rows.length} ردیف آماده ورود است.`
        : `${result.errors.length} خطا پیدا شد؛ قبل از ورود اصلاح کنید.`,
    jobId: job.id,
    sourceContent,
    acceptedRows: result.rows.length,
    rejectedRows: parsed.rows.length - result.rows.length,
    errors: result.errors,
  };
}

export async function commitCounterpartyImportAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const current = await requireCurrentWorkspace();

  if (!canWrite(current.role)) {
    return {
      ok: false,
      message: "برای ثبت اطلاعات دسترسی کافی ندارید.",
    };
  }

  const jobId = String(formData.get("jobId") ?? "");
  const sourceContent = String(formData.get("sourceContent") ?? "");

  if (!jobId || !sourceContent) {
    return {
      ok: false,
      message: "اطلاعات Dry Run ناقص است.",
    };
  }

  const parsed = parseCsv(sourceContent);
  const result = mapCounterpartyImportRows(parsed);

  if (result.errors.length > 0) {
    return {
      ok: false,
      message: "فایل از زمان Dry Run تغییر کرده یا معتبر نیست.",
      errors: result.errors,
    };
  }

  const committed = await commitCounterpartyImport({
    workspaceId: current.workspace.id,
    actorId: current.userId,
    actorRole: current.role,
    jobId,
    sourceContent,
    rows: result.rows,
  });

  revalidatePath("/app/data-portability");
  revalidatePath("/app/customers");
  revalidatePath("/app/suppliers");

  return {
    ok: true,
    message: `${committed.created.length} طرف حساب با موفقیت وارد شد.`,
  };
}
