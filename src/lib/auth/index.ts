import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getEnv } from "@/lib/validation/env";
import { loginSchema } from "@/lib/validation/schemas";
import { verifyPassword } from "@/lib/auth/password";
import { normalizeNigerianPhone } from "@/lib/utils/phone";
import { logger } from "@/lib/logger";

const env = getEnv();

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  secret: env.AUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: "/admin",
  },
  providers: [
    Credentials({
      name: "Email or phone",
      credentials: {
        identifier: { label: "Email or phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = loginSchema.safeParse(rawCredentials);
        if (!parsed.success) {
          return null;
        }

        const identifier = parsed.data.identifier.trim();
        const phone = normalizeNigerianPhone(identifier);
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: identifier.toLowerCase() },
              ...(phone ? [{ phone }] : []),
            ],
            status: "ACTIVE",
          },
        });

        if (!user?.passwordHash) {
          logger.warn("Failed login attempt", { identifierType: phone ? "phone" : "email" });
          return null;
        }

        const valid = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!valid) {
          logger.warn("Failed login attempt", { userId: user.id });
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.firstName,
          image: user.image,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.phone = user.phone;
      }

      const userId = user?.id ?? token.sub;
      if (userId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true, firstName: true, lastName: true, phone: true, status: true },
        });
        if (dbUser && dbUser.status === "ACTIVE") {
          token.role = dbUser.role;
          token.firstName = dbUser.firstName;
          token.lastName = dbUser.lastName;
          token.phone = dbUser.phone;
        }
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role as Role;
        session.user.firstName = String(token.firstName ?? session.user.name ?? "Customer");
        session.user.lastName = typeof token.lastName === "string" ? token.lastName : null;
        session.user.phone = typeof token.phone === "string" ? token.phone : null;
      }
      return session;
    },
  },
});
