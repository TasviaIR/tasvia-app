import { prisma } from "../../lib/prisma";
import { assertWorkspaceWriteEntitlement } from "../subscription/workspace-entitlement";

const channel = (value: string) => {
  const v = value.trim().toUpperCase();
  if (!["SMS","EMAIL","IN_APP"].includes(v)) throw new Error("NOTIFICATION_CHANNEL_INVALID");
  return v;
};
const recipient = (value: string) => {
  const v = value.trim();
  if (v.length < 3 || v.length > 200) throw new Error("NOTIFICATION_RECIPIENT_INVALID");
  return v;
};

export async function listNotifications(workspaceId: string) {
  const [templates, queue] = await Promise.all([
    prisma.notificationTemplate.findMany({
      where: { workspaceId },
      orderBy: [{ active: "desc" }, { code: "asc" }],
    }),
    prisma.operationalNotification.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);
  return { templates, queue };
}

export async function createNotificationTemplate(input: {
  workspaceId: string; code: string; name: string; channel: string; subject?: string; body: string;
}) {
  await assertWorkspaceWriteEntitlement(input.workspaceId);
  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{1,40}$/.test(code)) throw new Error("NOTIFICATION_CODE_INVALID");
  if (input.name.trim().length < 2) throw new Error("NOTIFICATION_NAME_INVALID");
  if (input.body.trim().length < 2) throw new Error("NOTIFICATION_BODY_INVALID");

  return prisma.notificationTemplate.create({
    data: {
      workspaceId: input.workspaceId,
      code,
      name: input.name.trim(),
      channel: channel(input.channel),
      subject: input.subject?.trim() || null,
      body: input.body.trim(),
    },
  });
}

export async function queueNotification(input: {
  workspaceId: string;
  templateId?: string;
  channel: string;
  recipient: string;
  subject?: string;
  body: string;
  scheduledAt?: Date;
  idempotencyKey: string;
  actorId: string;
}) {
  await assertWorkspaceWriteEntitlement(input.workspaceId);
  const idem = input.idempotencyKey.trim();
  if (idem.length < 8 || idem.length > 160) throw new Error("NOTIFICATION_IDEMPOTENCY_INVALID");
  if (input.body.trim().length < 2) throw new Error("NOTIFICATION_BODY_INVALID");

  if (input.templateId) {
    const template = await prisma.notificationTemplate.findFirst({
      where: { id: input.templateId, workspaceId: input.workspaceId, active: true },
      select: { id: true },
    });
    if (!template) throw new Error("NOTIFICATION_TEMPLATE_NOT_FOUND");
  }

  return prisma.operationalNotification.upsert({
    where: {
      workspaceId_idempotencyKey: {
        workspaceId: input.workspaceId,
        idempotencyKey: idem,
      },
    },
    update: {},
    create: {
      workspaceId: input.workspaceId,
      templateId: input.templateId || null,
      channel: channel(input.channel),
      recipient: recipient(input.recipient),
      subject: input.subject?.trim() || null,
      body: input.body.trim(),
      scheduledAt: input.scheduledAt,
      status: "QUEUED",
      idempotencyKey: idem,
      createdBy: input.actorId,
    },
  });
}
