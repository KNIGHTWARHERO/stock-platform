import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { auth } from "@/auth";
import { prisma } from "@/server/prisma";

export async function POST() {
  const session = await getServerSession(auth);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const draft = await prisma.kycSubmission.findFirst({ where: { userId: user.id, status: "DRAFT" } });
  if (!draft) return NextResponse.json({ error: "No draft" }, { status: 400 });

  await prisma.kycSubmission.update({
    where: { id: draft.id },
    data: { status: "SUBMITTED", submittedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
