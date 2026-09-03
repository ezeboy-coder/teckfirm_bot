import type { Role } from "@prisma/client";
import { ADMIN_ROLES, STAFF_ROLES } from "@/config/site";

const ROLE_RANK: Record<Role, number> = {
  CUSTOMER: 0,
  SUPPORT: 1,
  MANAGER: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
};

export function isStaffRole(role: Role | undefined): boolean {
  return Boolean(role && (STAFF_ROLES as readonly string[]).includes(role));
}

export function isAdminRole(role: Role | undefined): boolean {
  return Boolean(role && (ADMIN_ROLES as readonly string[]).includes(role));
}

export function hasMinRole(role: Role | undefined, minimum: Role): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}
