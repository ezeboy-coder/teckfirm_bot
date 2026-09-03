import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isStaffRole } from "@/lib/auth/roles";
import type { Role } from "@prisma/client";

export const getCurrentSession = cache(async () => auth());

export async function requireUser() {
  const session = await getCurrentSession();
  if (!session?.user) {
    redirect("/admin");
  }
  return session;
}

export async function requireStaff() {
  const session = await requireUser();
  if (!isStaffRole(session.user.role)) {
    redirect("/admin");
  }
  return session;
}

export async function requireRole(minimum: Role) {
  const session = await requireStaff();
  const rank: Record<Role, number> = {
    CUSTOMER: 0,
    SUPPORT: 1,
    MANAGER: 2,
    ADMIN: 3,
    SUPER_ADMIN: 4,
  };

  if (rank[session.user.role] < rank[minimum]) {
    redirect("/admin");
  }

  return session;
}
