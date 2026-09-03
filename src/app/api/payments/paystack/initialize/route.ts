import { apiError, apiSuccess } from "@/lib/api/response";
import { isDatabaseUnavailable } from "@/lib/db/catalog";
import { PaystackError, PaystackNotConfiguredError } from "@/lib/paystack/errors";
import { rateLimit, requestClientKey } from "@/lib/security/rate-limit";
import { guestCheckoutInitializeSchema } from "@/lib/validation/schemas";
import { CheckoutError, initializeGuestPayment } from "@/services/payment.service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = rateLimit(`paystack-init-30s:${requestClientKey(request)}`, 8, 30 * 1000);
  if (!limited.success) {
    return apiError("Too many payment attempts. Please wait 30 seconds.", "RATE_LIMITED", 429);
  }

  const body = (await request.json().catch(() => null)) as unknown;
  const parsed = guestCheckoutInitializeSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid checkout details", "INVALID_INPUT");
  }

  try {
    const result = await initializeGuestPayment(parsed.data);
    return apiSuccess(result, "Paystack checkout is ready");
  } catch (error) {
    if (error instanceof PaystackNotConfiguredError) {
      return apiError(error.message, error.code, 503);
    }
    if (error instanceof CheckoutError) {
      return apiError(error.message, error.code, error.status);
    }
    if (error instanceof PaystackError) {
      return apiError(error.message, error.code, 502);
    }
    if (isDatabaseUnavailable(error)) {
      return apiError("Unable to start checkout right now.", "DATABASE_OFFLINE", 503);
    }
    return apiError("Unable to start checkout right now.", "CHECKOUT_FAILED", 500);
  }
}
