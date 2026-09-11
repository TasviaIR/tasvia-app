import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "../../../../src/lib/auth";
import { prisma } from "../../../../src/lib/prisma";
import { validateRegistrationProfile } from "../../../../src/application/onboarding/onboarding-contract";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const profile = validateRegistrationProfile({
      firstName: String(body.firstName ?? ""),
      lastName: String(body.lastName ?? ""),
      phone: String(body.phone ?? ""),
      referralSource:
        typeof body.referralSource === "string" ? body.referralSource : undefined,
      termsAccepted: body.termsAccepted === true,
    });

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          name: `${profile.firstName} ${profile.lastName}`,
          phone: profile.phone,
          phoneVerified: false,
          phoneVerifiedAt: null,
        },
      });

      await tx.onboardingDraft.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          referralSource: profile.referralSource,
          termsAcceptedAt: new Date(),
          step: 1,
        },
        update: {
          referralSource: profile.referralSource,
          termsAcceptedAt: new Date(),
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PROFILE_INVALID";
    const status = message.includes("Unique constraint") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
