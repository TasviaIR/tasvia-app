import { createHash } from "node:crypto";
import { prisma } from "../../lib/prisma";
import { assertWorkspaceWriteEntitlement } from "../subscription/workspace-entitlement";

export async function listTaxSubmissions(workspaceId: string) {
  return prisma.taxSubmission.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function queueSalesInvoiceForModian(input: {
  workspaceId: string;
  salesInvoiceId: string;
  taxpayerId?: string;
  actorId: string;
}) {
  await assertWorkspaceWriteEntitlement(input.workspaceId);

  const invoice = await prisma.salesInvoice.findFirst({
    where: { id: input.salesInvoiceId, workspaceId: input.workspaceId },
    include: { customer: true, lines: true },
  });
  if (!invoice) throw new Error("TAX_INVOICE_NOT_FOUND");
  if (!["POSTED", "PAID"].includes(invoice.status)) throw new Error("TAX_INVOICE_NOT_POSTED");

  const canonical = JSON.stringify({
    workspaceId: input.workspaceId,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    customerId: invoice.customerId,
    issuedAt: invoice.issuedAt.toISOString(),
    subtotal: invoice.subtotal.toString(),
    discount: invoice.discount.toString(),
    tax: invoice.tax.toString(),
    total: invoice.total.toString(),
    currency: invoice.currency,
    lines: invoice.lines.map((line) => ({
      itemId: line.itemId,
      quantityMinorUnits: line.quantityMinorUnits.toString(),
      unitPrice: line.unitPrice.toString(),
      discount: line.discount.toString(),
      tax: line.tax.toString(),
      total: line.lineTotal.toString(),
    })),
  });
  const payloadHash = createHash("sha256").update(canonical).digest("hex");
  const idempotencyKey = `modian:sales:${invoice.id}:${payloadHash}`;

  return prisma.taxSubmission.upsert({
    where: {
      workspaceId_idempotencyKey: {
        workspaceId: input.workspaceId,
        idempotencyKey,
      },
    },
    update: {},
    create: {
      workspaceId: input.workspaceId,
      sourceType: "SALES_INVOICE",
      sourceDocumentId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      taxpayerId: input.taxpayerId?.trim() || invoice.customer.nationalId || null,
      payloadHash,
      idempotencyKey,
      status: "QUEUED",
      provider: "MODIAN",
      createdBy: input.actorId,
    },
  });
}

export async function markTaxSubmissionResult(input: {
  workspaceId: string;
  submissionId: string;
  status: "SUBMITTED" | "ACCEPTED" | "REJECTED";
  providerReference?: string;
  errorCode?: string;
  errorMessage?: string;
}) {
  const existing = await prisma.taxSubmission.findFirst({
    where: { id: input.submissionId, workspaceId: input.workspaceId },
  });
  if (!existing) throw new Error("TAX_SUBMISSION_NOT_FOUND");

  return prisma.taxSubmission.update({
    where: { id: existing.id },
    data: {
      status: input.status,
      providerReference: input.providerReference?.trim() || null,
      errorCode: input.errorCode?.trim() || null,
      errorMessage: input.errorMessage?.trim() || null,
      submittedAt: input.status === "SUBMITTED" ? new Date() : existing.submittedAt,
      acceptedAt: input.status === "ACCEPTED" ? new Date() : existing.acceptedAt,
    },
  });
}
