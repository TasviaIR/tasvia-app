import { prisma } from "../../lib/prisma";
import { assertWorkspaceWriteEntitlement } from "../subscription/workspace-entitlement";
import { recordAuditEventInTransaction } from "../audit/audit-service";

const MAX_EVIDENCE_BYTES = 15 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const SAFE_FILE_NAME = /^[\p{L}\p{N}._() -]{1,180}$/u;
const SHA256_HEX = /^[a-f0-9]{64}$/i;
const STORAGE_KEY_PATTERN = /^[a-zA-Z0-9/_\-.]{8,300}$/;
const ENTITY_PATTERN = /^[A-Za-z][A-Za-z0-9_]{1,79}$/;

function required(value: string, code: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(code);
  return normalized;
}

export function validateEvidenceMetadata(input: {
  category: string;
  sourceEntityType: string;
  sourceEntityId: string;
  safeFileName: string;
  mimeType: string;
  byteSize: number;
  sha256: string;
  storageKey: string;
}) {
  const category = required(input.category, "EVIDENCE_CATEGORY_REQUIRED");
  const sourceEntityType = required(
    input.sourceEntityType,
    "EVIDENCE_ENTITY_TYPE_REQUIRED",
  );
  const sourceEntityId = required(
    input.sourceEntityId,
    "EVIDENCE_ENTITY_ID_REQUIRED",
  );
  const safeFileName = required(input.safeFileName, "EVIDENCE_FILE_NAME_REQUIRED");
  const mimeType = required(input.mimeType, "EVIDENCE_MIME_REQUIRED");
  const sha256 = required(input.sha256, "EVIDENCE_SHA256_REQUIRED").toLowerCase();
  const storageKey = required(input.storageKey, "EVIDENCE_STORAGE_KEY_REQUIRED");

  if (!ENTITY_PATTERN.test(sourceEntityType)) {
    throw new Error("EVIDENCE_ENTITY_TYPE_INVALID");
  }

  if (!SAFE_FILE_NAME.test(safeFileName) || safeFileName.includes("..")) {
    throw new Error("EVIDENCE_FILE_NAME_INVALID");
  }

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error("EVIDENCE_MIME_NOT_ALLOWED");
  }

  if (!Number.isSafeInteger(input.byteSize) || input.byteSize <= 0 || input.byteSize > MAX_EVIDENCE_BYTES) {
    throw new Error("EVIDENCE_SIZE_INVALID");
  }

  if (!SHA256_HEX.test(sha256)) {
    throw new Error("EVIDENCE_SHA256_INVALID");
  }

  if (
    !STORAGE_KEY_PATTERN.test(storageKey) ||
    storageKey.startsWith("/") ||
    storageKey.includes("..")
  ) {
    throw new Error("EVIDENCE_STORAGE_KEY_INVALID");
  }

  return {
    category,
    sourceEntityType,
    sourceEntityId,
    safeFileName,
    mimeType,
    byteSize: input.byteSize,
    sha256,
    storageKey,
  };
}

export async function registerFinancialEvidence(input: {
  workspaceId: string;
  actorId: string;
  actorRole?: string;
  category: string;
  sourceEntityType: string;
  sourceEntityId: string;
  journalId?: string;
  safeFileName: string;
  mimeType: string;
  byteSize: number;
  sha256: string;
  storageKey: string;
  description?: string;
}) {
  await assertWorkspaceWriteEntitlement(input.workspaceId);
  const metadata = validateEvidenceMetadata(input);

  return prisma.$transaction(async (tx) => {
    if (input.journalId) {
      const journal = await tx.accountingJournal.findFirst({
        where: {
          id: input.journalId,
          workspaceId: input.workspaceId,
        },
        select: { id: true },
      });
      if (!journal) throw new Error("EVIDENCE_JOURNAL_NOT_FOUND");
    }

    const evidence = await tx.financialEvidence.create({
      data: {
        workspaceId: input.workspaceId,
        category: metadata.category,
        sourceEntityType: metadata.sourceEntityType,
        sourceEntityId: metadata.sourceEntityId,
        journalId: input.journalId?.trim() || null,
        safeFileName: metadata.safeFileName,
        mimeType: metadata.mimeType,
        byteSize: metadata.byteSize,
        sha256: metadata.sha256,
        storageKey: metadata.storageKey,
        description: input.description?.trim() || null,
        uploadedBy: input.actorId,
      },
    });

    await recordAuditEventInTransaction(tx, {
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: "FINANCIAL_EVIDENCE_REGISTERED",
      category: "EVIDENCE",
      entityType: "FinancialEvidence",
      entityId: evidence.id,
      metadata: {
        sourceEntityType: evidence.sourceEntityType,
        sourceEntityId: evidence.sourceEntityId,
        journalId: evidence.journalId,
        safeFileName: evidence.safeFileName,
        mimeType: evidence.mimeType,
        byteSize: evidence.byteSize,
        sha256: evidence.sha256,
      },
    });

    return evidence;
  });
}

export async function archiveFinancialEvidence(input: {
  workspaceId: string;
  actorId: string;
  actorRole?: string;
  evidenceId: string;
  reason: string;
}) {
  await assertWorkspaceWriteEntitlement(input.workspaceId);

  const reason = input.reason.trim();
  if (reason.length < 8) throw new Error("EVIDENCE_ARCHIVE_REASON_REQUIRED");

  return prisma.$transaction(async (tx) => {
    const current = await tx.financialEvidence.findFirst({
      where: {
        id: input.evidenceId,
        workspaceId: input.workspaceId,
        archivedAt: null,
      },
    });
    if (!current) throw new Error("EVIDENCE_NOT_FOUND");

    const archived = await tx.financialEvidence.update({
      where: { id: current.id },
      data: {
        archivedAt: new Date(),
        archivedBy: input.actorId,
        archiveReason: reason,
      },
    });

    await recordAuditEventInTransaction(tx, {
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: "FINANCIAL_EVIDENCE_ARCHIVED",
      category: "EVIDENCE",
      severity: "WARNING",
      entityType: "FinancialEvidence",
      entityId: current.id,
      reason,
      before: { archivedAt: current.archivedAt },
      after: { archivedAt: archived.archivedAt },
      metadata: {
        sourceEntityType: current.sourceEntityType,
        sourceEntityId: current.sourceEntityId,
        sha256: current.sha256,
      },
    });

    return archived;
  });
}

export function listFinancialEvidence(workspaceId: string, input?: {
  sourceEntityType?: string;
  sourceEntityId?: string;
  category?: string;
  includeArchived?: boolean;
}) {
  return prisma.financialEvidence.findMany({
    where: {
      workspaceId,
      ...(input?.sourceEntityType
        ? { sourceEntityType: input.sourceEntityType }
        : {}),
      ...(input?.sourceEntityId
        ? { sourceEntityId: input.sourceEntityId }
        : {}),
      ...(input?.category ? { category: input.category } : {}),
      ...(input?.includeArchived ? {} : { archivedAt: null }),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 200,
  });
}
