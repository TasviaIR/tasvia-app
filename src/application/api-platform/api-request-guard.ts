import { randomUUID } from "node:crypto";
import type { ApiScope } from "./api-contract";
import { apiError } from "./api-contract";
import { authorizeApi } from "./api-auth";
import { prisma } from "../../lib/prisma";

export const API_RATE_LIMIT_PER_MINUTE = 120;
const RATE_LIMIT_WINDOW_MS = 60_000;

type AuthorizedApiContext = {
  workspaceId: string;
  apiKeyId: string;
  requestId: string;
};

function requestPath(request: Request): string {
  try {
    return new URL(request.url).pathname;
  } catch {
    return "/api/v1";
  }
}

function responseWithRequestId(response: Response, requestId: string): Response {
  response.headers.set("x-request-id", requestId);
  return response;
}

export async function consumePersistentApiRateLimit(input: {
  workspaceId: string;
  apiKeyId: string;
  now?: Date;
  limit?: number;
}) {
  const now = input.now ?? new Date();
  const limit = input.limit ?? API_RATE_LIMIT_PER_MINUTE;
  const windowNumber = Math.floor(now.getTime() / RATE_LIMIT_WINDOW_MS);
  const windowStartedAt = new Date(windowNumber * RATE_LIMIT_WINDOW_MS);
  const expiresAt = new Date(windowStartedAt.getTime() + RATE_LIMIT_WINDOW_MS);
  const id = `${input.apiKeyId}:${windowNumber}`;

  const bucket = await prisma.apiRateLimitBucket.upsert({
    where: { id },
    create: {
      id,
      workspaceId: input.workspaceId,
      apiKeyId: input.apiKeyId,
      windowStartedAt,
      requestCount: 1,
      expiresAt,
    },
    update: {
      requestCount: { increment: 1 },
    },
    select: {
      requestCount: true,
      expiresAt: true,
    },
  });

  return {
    allowed: bucket.requestCount <= limit,
    remaining: Math.max(0, limit - bucket.requestCount),
    limit,
    resetAt: bucket.expiresAt,
  };
}

async function writeApiAudit(input: {
  workspaceId: string;
  apiKeyId: string;
  request: Request;
  requestId: string;
  statusCode: number;
}) {
  await prisma.apiAuditLog.create({
    data: {
      workspaceId: input.workspaceId,
      apiKeyId: input.apiKeyId,
      method: input.request.method,
      path: requestPath(input.request),
      statusCode: input.statusCode,
      requestId: input.requestId,
    },
  });
}

export async function withAuthorizedApi(
  request: Request,
  scope: ApiScope,
  handler: (context: AuthorizedApiContext) => Promise<Response>,
): Promise<Response> {
  const requestId = randomUUID();
  const auth = await authorizeApi(request, scope);

  if ("error" in auth && auth.error) {
    return responseWithRequestId(auth.error, requestId);
  }

  const rate = await consumePersistentApiRateLimit({
    workspaceId: auth.workspaceId,
    apiKeyId: auth.apiKeyId,
  });

  if (!rate.allowed) {
    const response = apiError(
      429,
      "RATE_LIMITED",
      "API rate limit exceeded",
    );
    response.headers.set(
      "retry-after",
      String(Math.max(1, Math.ceil((rate.resetAt.getTime() - Date.now()) / 1000))),
    );
    response.headers.set("x-ratelimit-limit", String(rate.limit));
    response.headers.set("x-ratelimit-remaining", "0");

    await writeApiAudit({
      workspaceId: auth.workspaceId,
      apiKeyId: auth.apiKeyId,
      request,
      requestId,
      statusCode: response.status,
    });

    return responseWithRequestId(response, requestId);
  }

  let response: Response;

  try {
    response = await handler({
      workspaceId: auth.workspaceId,
      apiKeyId: auth.apiKeyId,
      requestId,
    });
  } catch {
    response = apiError(500, "INTERNAL_ERROR", "API request failed");
  }

  response.headers.set("x-ratelimit-limit", String(rate.limit));
  response.headers.set("x-ratelimit-remaining", String(rate.remaining));

  await writeApiAudit({
    workspaceId: auth.workspaceId,
    apiKeyId: auth.apiKeyId,
    request,
    requestId,
    statusCode: response.status,
  });

  return responseWithRequestId(response, requestId);
}
