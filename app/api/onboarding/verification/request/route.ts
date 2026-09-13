import { randomInt } from "node:crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "../../../../../src/lib/auth";
import { prisma } from "../../../../../src/lib/prisma";
import { hashVerificationCode } from "../../../../../src/application/onboarding/verification-code";
import { deliverVerificationCode } from "../../../../../src/application/onboarding/verification-delivery";

const VERIFICATION_TTL_MINUTES = 10;

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const body = await request.json();

  const channel =
    body.channel === "PHONE"
      ? "PHONE"
      : body.channel === "EMAIL"
        ? "EMAIL"
        : null;

  if (!channel) {
    return NextResponse.json({ error: "CHANNEL_INVALID" }, { status: 400 });
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { email: true, phone: true },
  });

  const destination = channel === "EMAIL" ? user.email : user.phone;

  if (!destination) {
    return NextResponse.json(
      { error: "DESTINATION_MISSING" },
      { status: 400 },
    );
  }

  const code = String(randomInt(100000, 1000000));
  const expiresAt = new Date(
    Date.now() + VERIFICATION_TTL_MINUTES * 60 * 1000,
  );

  const delivery = await deliverVerificationCode({
    channel,
    destination,
    code,
    expiresInMinutes: VERIFICATION_TTL_MINUTES,
  });

  if (!delivery.delivered) {
    return NextResponse.json(
      { error: "VERIFICATION_DELIVERY_FAILED" },
      { status: 503 },
    );
  }

  // Persist a usable challenge only after successful provider delivery.
  await prisma.onboardingVerificationChallenge.create({
    data: {
      userId: session.user.id,
      channel,
      codeHash: hashVerificationCode(
        session.user.id,
        channel,
        code,
      ),
      expiresAt,
    },
  });

  return NextResponse.json({
    ok: true,
    expiresAt: expiresAt.toISOString(),
    debugCode:
      process.env.NODE_ENV === "production"
        ? undefined
        : process.env.ONBOARDING_VERIFICATION_MODE === "external"
          ? undefined
          : code,
  });
}
