CREATE TYPE "OnboardingVerificationChannel" AS ENUM ('EMAIL', 'PHONE');
CREATE TYPE "BusinessLanguage" AS ENUM ('FA', 'EN');
CREATE TYPE "InventoryAccountingSystem" AS ENUM ('PERIODIC', 'PERPETUAL');
CREATE TYPE "InventoryValuationMethod" AS ENUM ('FIFO');
CREATE TYPE "BusinessCalendar" AS ENUM ('SOLAR_HIJRI', 'GREGORIAN');

ALTER TABLE "User"
ADD COLUMN "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3);

ALTER TABLE "Workspace"
ADD COLUMN "setupCompletedAt" TIMESTAMP(3);

CREATE TABLE "OnboardingDraft" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "referralSource" TEXT,
  "termsAcceptedAt" TIMESTAMP(3),
  "businessName" TEXT,
  "defaultLanguage" "BusinessLanguage" NOT NULL DEFAULT 'FA',
  "legalName" TEXT,
  "businessType" TEXT,
  "activityField" TEXT,
  "nationalId" TEXT,
  "economicCode" TEXT,
  "registrationNumber" TEXT,
  "country" TEXT,
  "province" TEXT,
  "city" TEXT,
  "postalCode" TEXT,
  "businessPhone" TEXT,
  "fax" TEXT,
  "address" TEXT,
  "website" TEXT,
  "businessEmail" TEXT,
  "inventoryAccountingSystem" "InventoryAccountingSystem",
  "inventoryValuationMethod" "InventoryValuationMethod" NOT NULL DEFAULT 'FIFO',
  "manufacturingEnabled" BOOLEAN NOT NULL DEFAULT false,
  "inventoryEnabled" BOOLEAN NOT NULL DEFAULT true,
  "multiCurrencyEnabled" BOOLEAN NOT NULL DEFAULT false,
  "baseCurrency" TEXT NOT NULL DEFAULT 'IRR',
  "vatRateBasisPoints" INTEGER NOT NULL DEFAULT 1000,
  "calendar" "BusinessCalendar" NOT NULL DEFAULT 'SOLAR_HIJRI',
  "fiscalYearStartsAt" TIMESTAMP(3),
  "fiscalYearEndsAt" TIMESTAMP(3),
  "fiscalYearTitle" TEXT,
  "step" INTEGER NOT NULL DEFAULT 1,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OnboardingDraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OnboardingDraft_userId_key" ON "OnboardingDraft"("userId");

ALTER TABLE "OnboardingDraft"
ADD CONSTRAINT "OnboardingDraft_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "OnboardingVerificationChallenge" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "channel" "OnboardingVerificationChannel" NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OnboardingVerificationChallenge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OnboardingVerificationChallenge_userId_channel_expiresAt_idx"
ON "OnboardingVerificationChallenge"("userId", "channel", "expiresAt");

ALTER TABLE "OnboardingVerificationChallenge"
ADD CONSTRAINT "OnboardingVerificationChallenge_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WorkspaceBusinessProfile" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "legalName" TEXT NOT NULL,
  "defaultLanguage" "BusinessLanguage" NOT NULL DEFAULT 'FA',
  "businessType" TEXT NOT NULL,
  "activityField" TEXT,
  "nationalId" TEXT,
  "economicCode" TEXT,
  "registrationNumber" TEXT,
  "country" TEXT,
  "province" TEXT,
  "city" TEXT,
  "postalCode" TEXT,
  "phone" TEXT,
  "fax" TEXT,
  "address" TEXT,
  "website" TEXT,
  "email" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkspaceBusinessProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceBusinessProfile_workspaceId_key"
ON "WorkspaceBusinessProfile"("workspaceId");

ALTER TABLE "WorkspaceBusinessProfile"
ADD CONSTRAINT "WorkspaceBusinessProfile_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WorkspaceAccountingSettings" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "inventoryAccountingSystem" "InventoryAccountingSystem" NOT NULL,
  "inventoryValuationMethod" "InventoryValuationMethod" NOT NULL DEFAULT 'FIFO',
  "manufacturingEnabled" BOOLEAN NOT NULL DEFAULT false,
  "inventoryEnabled" BOOLEAN NOT NULL DEFAULT true,
  "multiCurrencyEnabled" BOOLEAN NOT NULL DEFAULT false,
  "baseCurrency" TEXT NOT NULL DEFAULT 'IRR',
  "vatRateBasisPoints" INTEGER NOT NULL DEFAULT 1000,
  "calendar" "BusinessCalendar" NOT NULL DEFAULT 'SOLAR_HIJRI',
  "fiscalYearStartsAt" TIMESTAMP(3) NOT NULL,
  "fiscalYearEndsAt" TIMESTAMP(3) NOT NULL,
  "fiscalYearTitle" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkspaceAccountingSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceAccountingSettings_workspaceId_key"
ON "WorkspaceAccountingSettings"("workspaceId");

ALTER TABLE "WorkspaceAccountingSettings"
ADD CONSTRAINT "WorkspaceAccountingSettings_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
