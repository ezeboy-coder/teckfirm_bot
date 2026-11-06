import { auth } from "@/lib/auth";
import { hasMinRole } from "@/lib/auth/roles";
import { apiError } from "@/lib/api/response";

export async function requireAdminApi() {
  const session = await auth();
  if (!session?.user) {
    return apiError("Sign in required.", "UNAUTHORIZED", 401);
  }
  if (!hasMinRole(session.user.role, "ADMIN")) {
    return apiError("Admin access required.", "FORBIDDEN", 403);
  }
  return null;
}
