import { apiError, apiSuccess } from "@/lib/api/response";
import { isDatabaseUnavailable } from "@/lib/db/catalog";
import { rateLimit, requestClientKey } from "@/lib/security/rate-limit";
import { paymentReferenceMessage } from "@/lib/utils/reference";
import { paystackReferenceSchema } from "@/lib/validation/schemas";
import { cancelPendingCheckout } from "@/services/payment.service";
import { getSupportPhone } from "@/services/site-setting.service";

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
    const supportPhone = await getSupportPhone();
    if (!result.ok) {
      return apiError(result.message, result.code, result.status);
    }
    if (result.vouchers.length > 0) {
      return apiSuccess(
        {
          vouchers: result.vouchers,
          pending: false,
          paid: true,
          cancelled: false,
          reference: parsed.data.reference,
          supportPhone,
        },
        result.vouchers.length === 1 ? "Here is your voucher." : "Here are your vouchers.",
      );
    }
    if (result.paid || result.pending) {
      return apiSuccess(
        {
          vouchers: [],
          pending: true,
          paid: result.paid,
          cancelled: false,
          reference: parsed.data.reference,
          supportPhone,
        },
        paymentReferenceMessage([parsed.data.reference]),
      );
    }
    return apiSuccess(
      {
        vouchers: [],
        pending: false,
        paid: false,
        cancelled: true,
        reference: parsed.data.reference,
        supportPhone,
      },
      "Payment was cancelled. No voucher was issued.",
    );
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return apiError("Unable to cancel payment right now.", "DATABASE_OFFLINE", 503);
    }
    return apiError("Unable to cancel payment right now.", "CANCEL_FAILED", 500);
  }
}
