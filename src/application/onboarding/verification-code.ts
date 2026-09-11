import { createHmac, timingSafeEqual } from "node:crypto";

export function hashVerificationCode(
  userId: string,
  channel: "EMAIL" | "PHONE",
  code: string,
): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("VERIFICATION_SECRET_NOT_CONFIGURED");
  }

  return createHmac("sha256", secret)
    .update(`${userId}:${channel}:${code}`)
    .digest("hex");
}

export function verificationCodeMatches(
  expectedHash: string,
  actualHash: string,
): boolean {
  const a = Buffer.from(expectedHash, "hex");
  const b = Buffer.from(actualHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
