import NextAuth, { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcrypt";
import { prisma } from "@/server/prisma";
import { LoginSchema } from "@/server/validators";
import { sendSigninNotice } from "@/server/email";
import { NextRequest } from "next/server";

const authOptions = (req: NextRequest): NextAuthOptions => ({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        const parsed = LoginSchema.safeParse(creds);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) return null;

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  events: {
    async signIn({ user }) {
      // fire-and-forget login email
      if (user?.email) {
        const ip = req.headers.get("x-forwarded-for") || req.ip || undefined;
        const ua = req.headers.get("user-agent") || undefined;
        sendSigninNotice(user.email, ip, ua).catch(() => {});
      }
    },
  },
  callbacks: {
    async session({ session, token }) {
      if (token.sub) {
        const u = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { id: true, email: true, name: true, phone: true, phoneVerifiedAt: true, kycs: { take: 1, orderBy: { updatedAt: "desc" } } }
        });
        if (u) {
          (session as any).user.id = u.id;
          (session as any).user.phone = u.phone;
          (session as any).user.phoneVerified = Boolean(u.phoneVerifiedAt);
          (session as any).user.kycStatus = u.kycs[0]?.status || "DRAFT";
        }
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});

const handler = (req: NextRequest, ctx: any) => NextAuth(authOptions(req));
export { handler as GET, handler as POST };
