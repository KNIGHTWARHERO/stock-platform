import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { auth } from "@/auth"; // we’ll create a tiny wrapper below
import { prisma } from "@/server/prisma";
import { KycDraftSchema } from "@/server/validators";
import { encrypt } from "@/server/crypto";

export async function POST(req: Request) {
  const session = await getServerSession(auth);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const d = KycDraftSchema.parse(body);

    const payload = {
      panNumberEnc: encrypt(d.panNumber),
      aadhaarLast4Enc: encrypt(d.aadhaarLast4),
      fullNameEnc: encrypt(d.fullName),
      dobEnc: encrypt(d.dob),
      addressLine1Enc: encrypt(d.addressLine1),
      addressLine2Enc: d.addressLine2 ? encrypt(d.addressLine2) : null,
      cityEnc: encrypt(d.city),
      stateEnc: encrypt(d.state),
      pincodeEnc: encrypt(d.pincode),
    };

    const kyc = await prisma.kycSubmission.upsert({
      where: { userId: user.id, status: "DRAFT" },
      update: payload,
      create: { userId: user.id, status: "DRAFT", ...payload },
    });

    return NextResponse.json({ ok: true, id: kyc.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Bad Request" }, { status: 400 });
  }
}
