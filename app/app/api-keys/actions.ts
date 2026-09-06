"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../../src/lib/prisma";
import { requireCurrentWorkspace } from "../../../src/auth/current-workspace";
import {
  issueApiSecret,
  validateApiScopes,
} from "../../../src/application/api-platform/api-contract";
import { recordAuditEvent } from "../../../src/application/audit/audit-service";

export type ApiKeyActionState = {
  secret: string | null;
  error: string | null;
};

function assertApiKeyManager(role: string) {
  if (role === "VIEWER") {
    throw new Error("API_KEY_PERMISSION_DENIED");
  }
}

function messageFor(error: unknown): string {
  const code = error instanceof Error ? error.message : "API_KEY_OPERATION_FAILED";

  if (code === "API_SCOPE_REQUIRED") return "حداقل یک سطح دسترسی را انتخاب کنید.";
  if (code === "API_SCOPE_INVALID") return "سطح دسترسی API معتبر نیست.";
  if (code === "API_KEY_NOT_FOUND") return "کلید API پیدا نشد یا قبلاً لغو شده است.";
  if (code === "API_KEY_PERMISSION_DENIED") return "دسترسی کافی ندارید.";
  if (code === "API_KEY_NAME_REQUIRED") return "نام کلید الزامی است.";

  return "عملیات کلید API انجام نشد.";
}

export async function createApiKey(
  _previousState: ApiKeyActionState,
  formData: FormData,
): Promise<ApiKeyActionState> {
  try {
    const current = await requireCurrentWorkspace();
    assertApiKeyManager(current.role);

    const name = String(formData.get("name") ?? "").trim();
    if (!name) throw new Error("API_KEY_NAME_REQUIRED");

    const scopes = validateApiScopes(
      formData.getAll("scopes").map((value) => String(value)),
    );
    const issued = issueApiSecret();

    const created = await prisma.apiKey.create({
      data: {
        workspaceId: current.workspace.id,
        name,
        prefix: issued.prefix,
        secretHash: issued.hash,
        scopes,
      },
    });

    await recordAuditEvent({
      workspaceId: current.workspace.id,
      actorId: current.userId,
      actorRole: current.role,
      action: "API_KEY_CREATED",
      category: "SECURITY",
      severity: "WARNING",
      entityType: "ApiKey",
      entityId: created.id,
      metadata: { name: created.name, prefix: created.prefix, scopes: created.scopes },
    });

    revalidatePath("/app/api-keys");
    return { secret: issued.token, error: null };
  } catch (error) {
    return { secret: null, error: messageFor(error) };
  }
}

export async function rotateApiKey(
  _previousState: ApiKeyActionState,
  formData: FormData,
): Promise<ApiKeyActionState> {
  try {
    const current = await requireCurrentWorkspace();
    assertApiKeyManager(current.role);

    const id = String(formData.get("id") ?? "").trim();
    if (!id) throw new Error("API_KEY_NOT_FOUND");

    const issued = issueApiSecret();
    const result = await prisma.apiKey.updateMany({
      where: {
        id,
        workspaceId: current.workspace.id,
        revokedAt: null,
      },
      data: {
        prefix: issued.prefix,
        secretHash: issued.hash,
        lastUsedAt: null,
      },
    });

    if (result.count !== 1) throw new Error("API_KEY_NOT_FOUND");

    await recordAuditEvent({
      workspaceId: current.workspace.id,
      actorId: current.userId,
      actorRole: current.role,
      action: "API_KEY_ROTATED",
      category: "SECURITY",
      severity: "CRITICAL",
      entityType: "ApiKey",
      entityId: id,
    });

    revalidatePath("/app/api-keys");
    return { secret: issued.token, error: null };
  } catch (error) {
    return { secret: null, error: messageFor(error) };
  }
}

export async function revokeApiKey(formData: FormData): Promise<void> {
  const current = await requireCurrentWorkspace();
  assertApiKeyManager(current.role);

  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("API_KEY_NOT_FOUND");

  const result = await prisma.apiKey.updateMany({
    where: {
      id,
      workspaceId: current.workspace.id,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

  if (result.count !== 1) throw new Error("API_KEY_NOT_FOUND");

  await recordAuditEvent({
    workspaceId: current.workspace.id,
    actorId: current.userId,
    actorRole: current.role,
    action: "API_KEY_REVOKED",
    category: "SECURITY",
    severity: "CRITICAL",
    entityType: "ApiKey",
    entityId: id,
  });

  revalidatePath("/app/api-keys");
}
