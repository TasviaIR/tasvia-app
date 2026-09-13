import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

type AuditJsonValue =
  | string
  | number
  | boolean
  | null
  | AuditJsonValue[]
  | { [key: string]: AuditJsonValue };

type AuditPayload = Record<string, unknown>;

const SENSITIVE_KEY_PATTERN =
  /(password|secret|token|authorization|cookie|credential|api[-_]?key|secretHash|accessToken|refreshToken|idToken)/i;
const MAX_AUDIT_PAYLOAD_BYTES = 32_000;
const MAX_AUDIT_DEPTH = 8;
const MAX_AUDIT_ARRAY_ITEMS = 100;

function sanitizeValue(value: unknown, depth: number): AuditJsonValue {
  if (depth > MAX_AUDIT_DEPTH) return "[MAX_DEPTH]";
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.slice(0, MAX_AUDIT_ARRAY_ITEMS).map((item) => sanitizeValue(item, depth + 1));

  if (typeof value === "object") {
    const output: Record<string, AuditJsonValue> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      output[key] = SENSITIVE_KEY_PATTERN.test(key)
        ? "[REDACTED]"
        : sanitizeValue(child, depth + 1);
    }
    return output;
  }

  return String(value);
}

export function redactAuditPayload(payload: AuditPayload | undefined): Record<string, AuditJsonValue> | undefined {
  if (!payload) return undefined;
  const redacted = sanitizeValue(payload, 0) as Record<string, AuditJsonValue>;
  const encoded = JSON.stringify(redacted);
  if (Buffer.byteLength(encoded, "utf8") > MAX_AUDIT_PAYLOAD_BYTES) {
    return { truncated: true, originalBytes: Buffer.byteLength(encoded, "utf8") };
  }
  return redacted;
}

export type RecordAuditEventInput = {
  workspaceId: string;
  actorId: string;
  actorRole?: string;
  actorType?: "USER" | "SYSTEM" | "API" | "SUPER_ADMIN" | "SUPPORT";
  action: string;
  category: string;
  severity?: "INFO" | "WARNING" | "CRITICAL";
  entityType: string;
  entityId: string;
  requestId?: string;
  reason?: string;
  before?: AuditPayload;
  after?: AuditPayload;
  metadata?: AuditPayload;
};

function normalizedRequired(value: string, code: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(code);
  return normalized;
}

function auditCreateData(input: RecordAuditEventInput) {
  return {
    workspaceId: normalizedRequired(input.workspaceId, "AUDIT_WORKSPACE_REQUIRED"),
    actorId: normalizedRequired(input.actorId, "AUDIT_ACTOR_REQUIRED"),
    actorRole: input.actorRole?.trim() || null,
    actorType: input.actorType ?? "USER",
    action: normalizedRequired(input.action, "AUDIT_ACTION_REQUIRED"),
    category: normalizedRequired(input.category, "AUDIT_CATEGORY_REQUIRED"),
    severity: input.severity ?? "INFO",
    entityType: normalizedRequired(input.entityType, "AUDIT_ENTITY_TYPE_REQUIRED"),
    entityId: normalizedRequired(input.entityId, "AUDIT_ENTITY_ID_REQUIRED"),
    requestId: input.requestId?.trim() || null,
    reason: input.reason?.trim() || null,
    beforeState: redactAuditPayload(input.before) as Prisma.InputJsonObject | undefined,
    afterState: redactAuditPayload(input.after) as Prisma.InputJsonObject | undefined,
    metadata: redactAuditPayload(input.metadata) as Prisma.InputJsonObject | undefined,
  };
}

export async function recordAuditEvent(input: RecordAuditEventInput) {
  return prisma.auditEvent.create({ data: auditCreateData(input) });
}

export async function recordAuditEventInTransaction(
  tx: Prisma.TransactionClient,
  input: RecordAuditEventInput,
) {
  return tx.auditEvent.create({ data: auditCreateData(input) });
}

export type AuditEventFilters = {
  actorId?: string;
  action?: string;
  category?: string;
  severity?: string;
  entityType?: string;
  entityId?: string;
  from?: Date;
  to?: Date;
  take?: number;
};

export async function listAuditEvents(workspaceId: string, filters: AuditEventFilters = {}) {
  const take = Math.max(1, Math.min(filters.take ?? 100, 250));

  return prisma.auditEvent.findMany({
    where: {
      workspaceId,
      ...(filters.actorId ? { actorId: filters.actorId } : {}),
      ...(filters.action ? { action: { contains: filters.action, mode: "insensitive" } } : {}),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.severity ? { severity: filters.severity } : {}),
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.entityId ? { entityId: filters.entityId } : {}),
      ...(filters.from || filters.to
        ? { createdAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
  });
}

export function auditEventsToCsv(events: Awaited<ReturnType<typeof listAuditEvents>>): string {
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const rows = [
    ["id","created_at","actor_id","actor_role","actor_type","action","category","severity","entity_type","entity_id","request_id","reason"],
    ...events.map((event) => [
      event.id,
      event.createdAt.toISOString(),
      event.actorId,
      event.actorRole ?? "",
      event.actorType,
      event.action,
      event.category,
      event.severity,
      event.entityType,
      event.entityId,
      event.requestId ?? "",
      event.reason ?? "",
    ]),
  ];
  return "\uFEFF" + rows.map((row) => row.map(escape).join(",")).join("\n");
}
