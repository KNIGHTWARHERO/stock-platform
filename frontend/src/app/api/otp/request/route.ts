import { NextResponse } from "next/server";
import { RequestOtpSchema } from "@/server/validators";
import { prisma } from "@/server/prisma";
import bcrypt from "bcrypt";
import { sendOtpSms } from "@/server/sms";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, purpose } = RequestOtpSchema.parse(body);

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(code, 10);

    // Store in DB
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await prisma.otpCode.create({ data: { phone, purpose, codeHash, expiresAt } });

    // Send SMS
    await sendOtpSms(phone, code);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Bad Request" }, { status: 400 });
  }
}
