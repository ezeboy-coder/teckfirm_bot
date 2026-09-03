import { apiError, apiSuccess } from "@/lib/api/response";
import { OMADA_FUNCTION_UNAVAILABLE_MESSAGE } from "@/lib/omada/errors";
import { rateLimit } from "@/lib/security/rate-limit";
import { paymentReferenceMessage } from "@/lib/utils/reference";
import { guestVoucherLookupSchema } from "@/lib/validation/schemas";
import { lookupGuestVouchers } from "@/services/voucher.service";

export async function POST(request: Request) {
  const limited = rateLimit("voucher-lookup", 12, 10 * 60 * 1000);
  if (!limited.success) {
    return apiError("Too many lookups. Please wait a moment.", "RATE_LIMITED", 429);
  }

  const body = (await request.json().catch(() => null)) as unknown;
  const parsed = guestVoucherLookupSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid details", "INVALID_INPUT");
  }

  const result = await lookupGuestVouchers(parsed.data.phone, parsed.data.pin, parsed.data.locationId);

  if (!result.ok) {
    if (result.reason === "invalid_phone") {
      return apiError("Enter an 11-digit phone number.", "INVALID_INPUT");
    }

    if (result.reason === "location_offline") {
      return apiError(
        result.message ?? "This location is currently not active.",
        "LOCATION_OFFLINE",
        409,
      );
    }

    if (result.reason === "omada_error") {
      return apiError(
        result.message ?? OMADA_FUNCTION_UNAVAILABLE_MESSAGE,
        "OMADA_LOOKUP_FAILED",
        502,
      );
    }

    return apiError(
      "No vouchers matched that phone number and PIN at this location.",
      "LOOKUP_NOT_FOUND",
      404,
    );
  }

  if (result.vouchers.length === 0) {
    return apiSuccess(
      { vouchers: [], pendingReferences: result.pendingReferences },
      result.pendingReferences.length > 0
        ? paymentReferenceMessage(result.pendingReferences)
        : "You have no unused or in-use vouchers at this location.",
    );
  }

  const message =
    result.vouchers.length === 1 ? "Here is your voucher." : "Here are your vouchers.";

  return apiSuccess({ vouchers: result.vouchers }, message);
}
