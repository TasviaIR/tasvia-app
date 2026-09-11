"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { BusinessCalendar, BusinessLanguage, InventoryAccountingSystem } from "@prisma/client";
import { auth, authConfigured } from "../../src/lib/auth";
import { prisma } from "../../src/lib/prisma";
import { provisionWorkspaceTrial } from "../../src/application/subscription/workspace-entitlement";

function text(formData: FormData, key: string, required = false, max = 500): string {
  const value = String(formData.get(key) ?? "").trim();
  if (required && !value) throw new Error(`${key.toUpperCase()}_REQUIRED`);
  if (value.length > max) throw new Error(`${key.toUpperCase()}_TOO_LONG`);
  return value;
}

function bool(formData: FormData, key: string): boolean {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function date(formData: FormData, key: string): Date {
  const value = text(formData, key, true, 32);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) throw new Error(`${key.toUpperCase()}_INVALID`);
  return parsed;
}

async function requireVerifiedUser() {
  if (!authConfigured) redirect("/sign-in?next=/onboarding");
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect("/sign-in?next=/onboarding");

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { id: true, emailVerified: true, phoneVerified: true },
  });

  if (!user.emailVerified || !user.phoneVerified) redirect("/verify");
  return user;
}

export async function saveBusinessBasicsAction(formData: FormData): Promise<void> {
  const user = await requireVerifiedUser();
  const businessName = text(formData, "businessName", true, 120);
  const defaultLanguage: BusinessLanguage = text(formData, "defaultLanguage") === "EN" ? "EN" : "FA";

  await prisma.onboardingDraft.upsert({
    where: { userId: user.id },
    create: { userId: user.id, businessName, defaultLanguage, step: 2 },
    update: { businessName, defaultLanguage, step: 2 },
  });
  redirect("/onboarding?step=2");
}

export async function saveBusinessProfileAction(formData: FormData): Promise<void> {
  const user = await requireVerifiedUser();
  await prisma.onboardingDraft.update({
    where: { userId: user.id },
    data: {
      legalName: text(formData, "legalName", true, 160),
      businessType: text(formData, "businessType", true, 80),
      activityField: text(formData, "activityField", false, 120) || null,
      nationalId: text(formData, "nationalId", false, 32) || null,
      economicCode: text(formData, "economicCode", false, 32) || null,
      registrationNumber: text(formData, "registrationNumber", false, 32) || null,
      country: text(formData, "country", false, 80) || null,
      province: text(formData, "province", false, 80) || null,
      city: text(formData, "city", false, 80) || null,
      postalCode: text(formData, "postalCode", false, 24) || null,
      businessPhone: text(formData, "businessPhone", false, 32) || null,
      fax: text(formData, "fax", false, 32) || null,
      address: text(formData, "address", false, 500) || null,
      website: text(formData, "website", false, 180) || null,
      businessEmail: text(formData, "businessEmail", false, 180) || null,
      step: 3,
    },
  });
  redirect("/onboarding?step=3");
}

export async function completeBusinessSetupAction(formData: FormData): Promise<void> {
  const user = await requireVerifiedUser();
  const existingMembership = await prisma.membership.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    select: { workspaceId: true },
  });
  if (existingMembership) redirect("/app");

  const draft = await prisma.onboardingDraft.findUniqueOrThrow({ where: { userId: user.id } });
  if (!draft.businessName || !draft.legalName || !draft.businessType || draft.completedAt) {
    throw new Error("ONBOARDING_DRAFT_INCOMPLETE");
  }

  const inventoryAccountingSystem: InventoryAccountingSystem =
    text(formData, "inventoryAccountingSystem", true, 32) === "PERIODIC" ? "PERIODIC" : "PERPETUAL";
  const baseCurrency = text(formData, "baseCurrency", true, 12).toUpperCase();
  const vatPercent = Number(text(formData, "vatRate", true, 16));
  if (!Number.isFinite(vatPercent) || vatPercent < 0 || vatPercent > 100) throw new Error("VAT_RATE_INVALID");
  const calendar: BusinessCalendar = text(formData, "calendar") === "GREGORIAN" ? "GREGORIAN" : "SOLAR_HIJRI";
  const fiscalYearStartsAt = date(formData, "fiscalYearStartsAt");
  const fiscalYearEndsAt = date(formData, "fiscalYearEndsAt");
  if (fiscalYearEndsAt <= fiscalYearStartsAt) throw new Error("FISCAL_YEAR_RANGE_INVALID");
  const fiscalYearTitle = text(formData, "fiscalYearTitle", true, 120);
  const startedAt = new Date();
  const slug = `ws-${randomUUID().replaceAll("-", "").slice(0, 16)}`;

  await prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: {
        name: draft.businessName!,
        slug,
        setupCompletedAt: startedAt,
        memberships: { create: { userId: user.id, role: "OWNER", status: "ACTIVE" } },
        businessProfile: {
          create: {
            legalName: draft.legalName!,
            defaultLanguage: draft.defaultLanguage as BusinessLanguage,
            businessType: draft.businessType!,
            activityField: draft.activityField,
            nationalId: draft.nationalId,
            economicCode: draft.economicCode,
            registrationNumber: draft.registrationNumber,
            country: draft.country,
            province: draft.province,
            city: draft.city,
            postalCode: draft.postalCode,
            phone: draft.businessPhone,
            fax: draft.fax,
            address: draft.address,
            website: draft.website,
            email: draft.businessEmail,
          },
        },
        accountingSettings: {
          create: {
            inventoryAccountingSystem,
            inventoryValuationMethod: "FIFO",
            manufacturingEnabled: bool(formData, "manufacturingEnabled"),
            inventoryEnabled: bool(formData, "inventoryEnabled"),
            multiCurrencyEnabled: bool(formData, "multiCurrencyEnabled"),
            baseCurrency,
            vatRateBasisPoints: Math.round(vatPercent * 100),
            calendar,
            fiscalYearStartsAt,
            fiscalYearEndsAt,
            fiscalYearTitle,
          },
        },
        fiscalPeriods: {
          create: { name: fiscalYearTitle, startsAt: fiscalYearStartsAt, endsAt: fiscalYearEndsAt, status: "OPEN" },
        },
      },
    });

    await provisionWorkspaceTrial(tx, workspace.id, startedAt);

    await tx.onboardingDraft.update({
      where: { userId: user.id },
      data: {
        inventoryAccountingSystem,
        inventoryValuationMethod: "FIFO",
        manufacturingEnabled: bool(formData, "manufacturingEnabled"),
        inventoryEnabled: bool(formData, "inventoryEnabled"),
        multiCurrencyEnabled: bool(formData, "multiCurrencyEnabled"),
        baseCurrency,
        vatRateBasisPoints: Math.round(vatPercent * 100),
        calendar,
        fiscalYearStartsAt,
        fiscalYearEndsAt,
        fiscalYearTitle,
        step: 4,
        completedAt: startedAt,
      },
    });

    await tx.auditEvent.create({
      data: {
        workspaceId: workspace.id,
        actorId: user.id,
        actorRole: "OWNER",
        category: "PRODUCTION_READINESS",
        severity: "INFO",
        action: "WORKSPACE_ONBOARDING_COMPLETED",
        entityType: "Workspace",
        entityId: workspace.id,
        metadata: JSON.stringify({ source: "FINAL_ONBOARDING", trialDays: 15, baseCurrency, calendar, inventoryAccountingSystem }),
      },
    });
  });

  redirect("/app");
}
