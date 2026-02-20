import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { auth } from "@/auth";
import { prisma } from "@/server/prisma";

export async function GET() {
  const session = await getServerSession(auth);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const kyc = await prisma.kycSubmission.findFirst({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, status: true, submittedAt: true, reviewedAt: true, rejectNote: true },
  });

  return NextResponse.json({ status: kyc?.status || "DRAFT", kyc });
}
