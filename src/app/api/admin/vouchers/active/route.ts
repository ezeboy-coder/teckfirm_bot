import { apiError, apiSuccess } from "@/lib/api/response";
import { requireStaffApi } from "@/lib/auth/admin-api";
import { listAdminActiveVouchers } from "@/services/voucher.service";

export async function GET() {
  const denied = await requireStaffApi();
  if (denied) return denied;

  try {
    const vouchers = await listAdminActiveVouchers();
    const message =
      vouchers.length === 0
        ? "There are no unused or in-use vouchers right now."
        : "Active vouchers loaded.";
    return apiSuccess({ vouchers }, message);
  } catch {
    return apiError("Could not load active vouchers.", "ACTIVE_VOUCHERS_FAILED", 502);
  }
}
