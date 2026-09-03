import { apiError, apiSuccess } from "@/lib/api/response";
import { isDatabaseUnavailable } from "@/lib/db/catalog";
import { rateLimit, requestClientKey } from "@/lib/security/rate-limit";
import { paystackReferenceSchema } from "@/lib/validation/schemas";
import { cancelPendingCheckout } from "@/services/payment.service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = rateLimit(`paystack-cancel:${requestClientKey(request)}`, 12, 10 * 60 * 1000);
  if (!limited.success) {
    return apiError("Too many cancel attempts. Please wait a moment.", "RATE_LIMITED", 429);
  }

  const body = (await request.json().catch(() => null)) as unknown;
  const parsed = paystackReferenceSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Missing payment reference.", "INVALID_INPUT");
  }

  try {
    const result = await cancelPendingCheckout(parsed.data.reference);
    if (!result.ok) {
      return apiError(result.message, result.code, result.status);
    }
    if (result.vouchers.length > 0) {
      return apiSuccess(
        { vouchers: result.vouchers, pending: result.pending },
        result.vouchers.length === 1 ? "Here is your voucher." : "Here are your vouchers.",
      );
    }
    return apiSuccess({ vouchers: [], pending: false }, "Payment was cancelled. No voucher was issued.");
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return apiError("Unable to cancel payment right now.", "DATABASE_OFFLINE", 503);
    }
    return apiError("Unable to cancel payment right now.", "CANCEL_FAILED", 500);
  }
}
