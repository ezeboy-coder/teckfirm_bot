import { apiError, apiSuccess } from "@/lib/api/response";
import { isDatabaseUnavailable } from "@/lib/db/catalog";
import { rateLimit } from "@/lib/security/rate-limit";
import { paymentReferenceMessage } from "@/lib/utils/reference";
import { confirmPaystackReference } from "@/services/payment.service";
import { getSupportPhone } from "@/services/site-setting.service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const { reference } = await params;
  const trimmed = reference.trim();
  if (!trimmed) {
    return apiError("Missing payment reference.", "INVALID_INPUT");
  }

  const limited = rateLimit(`paystack-verify:${trimmed}`, 20, 10 * 60 * 1000);
  if (!limited.success) {
    return apiError("Too many confirmation attempts. Please wait a moment.", "RATE_LIMITED", 429);
  }

  try {
    const result = await confirmPaystackReference(trimmed);
    const supportPhone = await getSupportPhone();
    if (!result.ok) {
      return apiError(result.message, result.code, result.status);
    }

    const message = result.vouchers.length
      ? result.vouchers.length === 1
        ? "Here is your voucher."
        : "Here are your vouchers."
      : paymentReferenceMessage([trimmed]);

    return apiSuccess(
      {
        vouchers: result.vouchers,
        pending: result.pending,
        reference: trimmed,
        supportPhone,
      },
      message,
    );
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return apiError("Unable to confirm payment right now.", "DATABASE_OFFLINE", 503);
    }
    return apiError("Unable to confirm payment right now.", "VERIFY_FAILED", 500);
  }
}
