"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentWorkspace } from "../../../src/auth/current-workspace";
import { recordAuditEvent } from "../../../src/application/audit/audit-service";
import {
  completeManufacturingOrder,
  createBom,
  createManufacturingOrder,
} from "../../../src/application/manufacturing/manufacturing-service";
import { queueSalesInvoiceForModian } from "../../../src/application/tax/tax-submission-service";
import {
  createNotificationTemplate,
  queueNotification,
} from "../../../src/application/notifications/notification-service";

function canWrite(role: string) {
  if (role === "VIEWER") throw new Error("P61_WAVE3_PERMISSION_DENIED");
}
const s=(f:FormData,k:string)=>String(f.get(k)??"");
const bi=(f:FormData,k:string)=>BigInt(s(f,k)||"0");
const ni=(f:FormData,k:string)=>Number.parseInt(s(f,k)||"0",10);

async function audit(current: Awaited<ReturnType<typeof requireCurrentWorkspace>>, action: string, entityType: string, entityId: string) {
  await recordAuditEvent({
    workspaceId: current.workspace.id,
    actorId: current.userId,
    actorRole: current.role,
    action,
    category: "OPERATIONS",
    entityType,
    entityId,
  });
}

export async function createBomAction(formData: FormData) {
  const current=await requireCurrentWorkspace(); canWrite(current.role);
  const componentItemId=s(formData,"componentItemId");
  const created=await createBom({
    workspaceId:current.workspace.id,
    code:s(formData,"code"),
    name:s(formData,"name"),
    outputItemId:s(formData,"outputItemId"),
    outputQuantity:bi(formData,"outputQuantity"),
    components:[{
      itemId:componentItemId,
      quantityMinorUnits:bi(formData,"componentQuantity"),
      wasteBasisPoints:ni(formData,"wasteBasisPoints"),
    }],
  });
  await audit(current,"MANUFACTURING_BOM_CREATED","ManufacturingBom",created.id);
  revalidatePath("/app/manufacturing");
}

export async function createManufacturingOrderAction(formData: FormData) {
  const current=await requireCurrentWorkspace(); canWrite(current.role);
  const created=await createManufacturingOrder({
    workspaceId:current.workspace.id,
    bomId:s(formData,"bomId"),
    warehouseId:s(formData,"warehouseId"),
    orderNumber:s(formData,"orderNumber"),
    plannedOutputQuantity:bi(formData,"plannedOutputQuantity"),
    laborCost:bi(formData,"laborCost"),
    overheadCost:bi(formData,"overheadCost"),
    actorId:current.userId,
  });
  await audit(current,"MANUFACTURING_ORDER_CREATED","ManufacturingOrder",created.id);
  revalidatePath("/app/manufacturing");
}

export async function completeManufacturingOrderAction(formData: FormData) {
  const current=await requireCurrentWorkspace(); canWrite(current.role);
  const id=s(formData,"orderId");
  const completed=await completeManufacturingOrder({
    workspaceId:current.workspace.id,
    orderId:id,
    actualOutputQuantity:bi(formData,"actualOutputQuantity"),
    actorId:current.userId,
  });
  await audit(current,"MANUFACTURING_ORDER_COMPLETED","ManufacturingOrder",completed.id);
  revalidatePath("/app/manufacturing");
}

export async function queueModianAction(formData: FormData) {
  const current=await requireCurrentWorkspace(); canWrite(current.role);
  const queued=await queueSalesInvoiceForModian({
    workspaceId:current.workspace.id,
    salesInvoiceId:s(formData,"salesInvoiceId"),
    taxpayerId:s(formData,"taxpayerId"),
    actorId:current.userId,
  });
  await audit(current,"MODIAN_SUBMISSION_QUEUED","TaxSubmission",queued.id);
  revalidatePath("/app/tax");
}

export async function createNotificationTemplateAction(formData: FormData) {
  const current=await requireCurrentWorkspace(); canWrite(current.role);
  const created=await createNotificationTemplate({
    workspaceId:current.workspace.id,
    code:s(formData,"code"),
    name:s(formData,"name"),
    channel:s(formData,"channel"),
    subject:s(formData,"subject"),
    body:s(formData,"body"),
  });
  await audit(current,"NOTIFICATION_TEMPLATE_CREATED","NotificationTemplate",created.id);
  revalidatePath("/app/notifications");
}

export async function queueNotificationAction(formData: FormData) {
  const current=await requireCurrentWorkspace(); canWrite(current.role);
  const queued=await queueNotification({
    workspaceId:current.workspace.id,
    channel:s(formData,"channel"),
    recipient:s(formData,"recipient"),
    subject:s(formData,"subject"),
    body:s(formData,"body"),
    idempotencyKey:s(formData,"idempotencyKey"),
    actorId:current.userId,
  });
  await audit(current,"NOTIFICATION_QUEUED","OperationalNotification",queued.id);
  revalidatePath("/app/notifications");
}
