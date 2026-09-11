import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "../../../../../src/lib/auth";
import { prisma } from "../../../../../src/lib/prisma";
import {
  hashVerificationCode,
  verificationCodeMatches,
} from "../../../../../src/application/onboarding/verification-code";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const body = await request.json();
  const channel = body.channel === "PHONE" ? "PHONE" : body.channel === "EMAIL" ? "EMAIL" : null;
  const code = String(body.code ?? "").trim();

  if (!channel || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "CODE_INVALID" }, { status: 400 });
  }

  const challenge = await prisma.onboardingVerificationChallenge.findFirst({
    where: {
      userId: session.user.id,
      channel,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!challenge || challenge.attempts >= 5) {
    return NextResponse.json({ error: "CHALLENGE_INVALID" }, { status: 400 });
  }

  const actualHash = hashVerificationCode(session.user.id, channel, code);
  const matches = verificationCodeMatches(challenge.codeHash, actualHash);

  if (!matches) {
    await prisma.onboardingVerificationChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    return NextResponse.json({ error: "CODE_MISMATCH" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.onboardingVerificationChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });

    await tx.user.update({
      where: { id: session.user.id },
      data:
        channel === "EMAIL"
          ? { emailVerified: true }
          : { phoneVerified: true, phoneVerifiedAt: new Date() },
    });
  });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { emailVerified: true, phoneVerified: true },
  });

  return NextResponse.json({
    ok: true,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
  });
}
