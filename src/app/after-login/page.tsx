import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { isStaffRole } from "@/lib/auth/roles";

export default async function AfterLoginPage() {
  const session = await requireUser();
  redirect(isStaffRole(session.user.role) ? "/admin" : "/");
}
