import type { DefaultSession } from "next-auth";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      firstName: string;
      lastName?: string | null;
      phone?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    firstName: string;
    lastName?: string | null;
    phone?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    firstName: string;
    lastName?: string | null;
    phone?: string | null;
  }
}
