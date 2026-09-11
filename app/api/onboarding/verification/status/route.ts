import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "../../../../../src/lib/auth";
import { prisma } from "../../../../../src/lib/prisma";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { emailVerified: true, phoneVerified: true, email: true, phone: true },
  });

  return NextResponse.json(user);
}
