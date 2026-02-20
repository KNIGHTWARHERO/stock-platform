import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { auth } from "@/auth";
import { prisma } from "@/server/prisma";
import formidable from "formidable";
import fs from "fs";
import path from "path";

// Next.js App Router needs this for form-data parsing
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function parseForm(req: Request): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: false, uploadDir: process.env.UPLOAD_DIR || "./uploads", keepExtensions: true });
    form.parse((req as any), (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export async function POST(req: any) {
  const session = await getServerSession(auth);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ensure upload dir
  const dir = process.env.UPLOAD_DIR || "./uploads";
  fs.mkdirSync(dir, { recursive: true });

  try {
    const { fields, files } = await parseForm(req);
    const kind = (fields.kind as string) || "PAN"; // e.g., "PAN" | "AADHAAR" | "SELFIE"
    const file: any = files.file;
    if (!file) return NextResponse.json({ error: "File missing" }, { status: 400 });

    // Save metadata to latest DRAFT KYC
    const kyc = await prisma.kycSubmission.findFirst({ where: { userId: user.id, status: "DRAFT" } });
    if (!kyc) return NextResponse.json({ error: "No KYC draft" }, { status: 400 });

    const rel = path.relative(process.cwd(), file.filepath || file.filepath);
    const arr = Array.isArray(kyc.docsJson) ? kyc.docsJson as any[] : (kyc.docsJson ? (kyc.docsJson as any) : []);
    arr.push({ kind, path: rel, name: file.originalFilename, size: file.size, type: file.mimetype });

    await prisma.kycSubmission.update({
      where: { id: kyc.id },
      data: { docsJson: arr as any },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Upload failed" }, { status: 400 });
  }
}
