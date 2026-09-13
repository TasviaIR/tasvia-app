import { createHash, randomBytes } from "node:crypto";

export const API_SCOPES = [
  "customers:read",
  "suppliers:read",
  "sales:read",
  "purchases:read",
  "inventory:read",
  "treasury:read",
  "reports:read",
] as const;

export type ApiScope = (typeof API_SCOPES)[number];

export function issueApiSecret() {
  const raw = randomBytes(32).toString("base64url");
  const token = `tv_live_${raw}`;

  return {
    token,
    prefix: raw.slice(0, 8),
    hash: hashApiSecret(token),
  };
}

export function hashApiSecret(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hasScope(granted: string[], required: ApiScope) {
  return granted.includes(required);
}

export function validateApiScopes(values: string[]): ApiScope[] {
  const unique = [...new Set(values.map((value) => value.trim()).filter(Boolean))];

  if (unique.length === 0) {
    throw new Error("API_SCOPE_REQUIRED");
  }

  for (const value of unique) {
    if (!API_SCOPES.includes(value as ApiScope)) {
      throw new Error("API_SCOPE_INVALID");
    }
  }

  return unique as ApiScope[];
}

export function apiError(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}
