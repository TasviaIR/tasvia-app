import { betterAuth } from "better-auth/minimal";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

const secret = process.env.BETTER_AUTH_SECRET;
const configuredBaseURL = process.env.BETTER_AUTH_URL?.trim();

const baseURL =
  configuredBaseURL ||
  (process.env.NODE_ENV === "production"
    ? "https://tasvin.ir"
    : "http://localhost:3000");

export const authConfigured = Boolean(secret && secret.length >= 32);

export const auth = betterAuth({
  baseURL,
  appName: "Tasvin",
  secret: authConfigured
    ? secret
    : "tasvin-build-only-fallback-secret-32-characters-minimum",
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
});
