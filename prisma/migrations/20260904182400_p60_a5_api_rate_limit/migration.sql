CREATE TABLE "ApiRateLimitBucket" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "windowStartedAt" TIMESTAMP(3) NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiRateLimitBucket_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ApiRateLimitBucket_workspaceId_apiKeyId_windowStartedAt_idx"
ON "ApiRateLimitBucket"("workspaceId", "apiKeyId", "windowStartedAt");

CREATE INDEX "ApiRateLimitBucket_expiresAt_idx"
ON "ApiRateLimitBucket"("expiresAt");
