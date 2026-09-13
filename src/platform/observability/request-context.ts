import { randomUUID } from "node:crypto";

export type RequestContext = {
  requestId: string;
  startedAt: number;
};

export function createRequestContext(
  providedRequestId?: string | null,
): RequestContext {
  const requestId =
    providedRequestId?.trim() ||
    randomUUID();

  return {
    requestId,
    startedAt: Date.now(),
  };
}

export function completeRequestContext(context: RequestContext) {
  return {
    requestId: context.requestId,
    durationMs: Math.max(0, Date.now() - context.startedAt),
  };
}
