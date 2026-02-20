import { NextResponse } from "next/server";
import { VerifyOtpSchema } from "@/server/validators";
import { prisma } from "@/server/prisma";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, code, purpose } = VerifyOtpSchema.parse(body);

    const otp = await prisma.otpCode.findFirst({
      where: { phone, purpose, consumed: false },
      orderBy: { createdAt: "desc" },
    });

    if (!otp) return NextResponse.json({ error: "OTP not found" }, { status: 400 });
    if (otp.expiresAt < new Date()) return NextResponse.json({ error: "OTP expired" }, { status: 400 });

    const ok = await bcrypt.compare(code, otp.codeHash);
    if (!ok) return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });

    // mark consumed
    await prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } });

    // set user's phoneVerifiedAt if user exists
    const user = await prisma.user.findFirst({ where: { phone } });
    if (user && !user.phoneVerifiedAt) {
      await prisma.user.update({ where: { id: user.id }, data: { phoneVerifiedAt: new Date() } });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Bad Request" }, { status: 400 });
  }
}
