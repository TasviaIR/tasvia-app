"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../../src/lib/prisma";
import { requireCurrentWorkspace } from "../../../src/auth/current-workspace";
import { payrollNet } from "../../../src/application/workforce/workforce-center-service";
import { recordAuditEvent } from "../../../src/application/audit/audit-service";

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const money = (fd: FormData, key: string) => {
  const raw = text(fd, key).replace(/[,\s]/g, "");
  if (!/^\d+$/.test(raw)) throw new Error(`INVALID_${key.toUpperCase()}`);
  return BigInt(raw);
};

export async function createEmployeeAction(fd: FormData) {
  const c = await requireCurrentWorkspace();
  if (c.role === "VIEWER") throw new Error("PAYROLL_WRITE_FORBIDDEN");

  const employeeCode = text(fd, "employeeCode");
  const name = text(fd, "name");
  if (!employeeCode || !name) throw new Error("EMPLOYEE_REQUIRED_FIELDS");

  const employee = await prisma.employee.create({
    data: {
      workspaceId: c.workspace.id,
      employeeCode,
      name,
      nationalId: text(fd, "nationalId") || null,
      mobile: text(fd, "mobile") || null,
      baseSalary: money(fd, "baseSalary"),
    },
  });

  await recordAuditEvent({
    workspaceId: c.workspace.id,
    actorId: c.userId,
    actorRole: c.role,
    action: "EMPLOYEE_CREATED",
    category: "PAYROLL",
    entityType: "Employee",
    entityId: employee.id,
    after: {
      employeeCode: employee.employeeCode,
      name: employee.name,
      baseSalary: employee.baseSalary,
      active: employee.active,
    },
  });

  revalidatePath("/app/payroll");
}

export async function createPayrollRunAction(fd: FormData) {
  const c = await requireCurrentWorkspace();
  if (c.role === "VIEWER") throw new Error("PAYROLL_WRITE_FORBIDDEN");

  const employeeId = text(fd, "employeeId");
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, workspaceId: c.workspace.id, active: true },
  });
  if (!employee) throw new Error("EMPLOYEE_NOT_FOUND");

  const grossPay = money(fd, "grossPay");
  const deductions = money(fd, "deductions");
  const netPay = payrollNet(grossPay, deductions);
  const periodStart = new Date(text(fd, "periodStart"));
  const periodEnd = new Date(text(fd, "periodEnd"));

  if (!Number.isFinite(periodStart.getTime()) || !Number.isFinite(periodEnd.getTime()) || periodEnd < periodStart) {
    throw new Error("PAYROLL_PERIOD_INVALID");
  }

  const run = await prisma.payrollRun.create({
    data: {
      workspaceId: c.workspace.id,
      title: text(fd, "title") || "دوره حقوق",
      periodStart,
      periodEnd,
      lines: {
        create: {
          employeeId,
          grossPay,
          deductions,
          netPay,
          note: text(fd, "note") || null,
        },
      },
    },
  });

  await recordAuditEvent({
    workspaceId: c.workspace.id,
    actorId: c.userId,
    actorRole: c.role,
    action: "PAYROLL_RUN_CREATED",
    category: "PAYROLL",
    severity: "WARNING",
    entityType: "PayrollRun",
    entityId: run.id,
    after: {
      title: run.title,
      periodStart: run.periodStart,
      periodEnd: run.periodEnd,
      status: run.status,
    },
    metadata: { employeeId, grossPay, deductions, netPay },
  });

  revalidatePath("/app/payroll");
}
