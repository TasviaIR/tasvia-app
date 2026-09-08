type LogLevel = "info" | "warn" | "error";

export type StructuredLog = {
  level: LogLevel;
  event: string;
  requestId?: string;
  workspaceId?: string;
  durationMs?: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

const forbiddenKeys = new Set([
  "password",
  "secret",
  "token",
  "authorization",
  "cookie",
  "apiKey",
  "api_key",
]);

function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redact);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        forbiddenKeys.has(key) ? "[REDACTED]" : redact(entry),
      ]),
    );
  }

  return value;
}

export function createStructuredLog(
  input: Omit<StructuredLog, "timestamp" | "metadata"> & {
    metadata?: Record<string, unknown>;
  },
): StructuredLog {
  return {
    ...input,
    timestamp: new Date().toISOString(),
    metadata: input.metadata
      ? (redact(input.metadata) as Record<string, unknown>)
      : undefined,
  };
}
