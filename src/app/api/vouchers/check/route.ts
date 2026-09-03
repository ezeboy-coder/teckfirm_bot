import { apiError, apiSuccess } from "@/lib/api/response";
import { voucherCheckSchema } from "@/lib/validation/schemas";
import { rateLimit } from "@/lib/security/rate-limit";
import { checkVoucherOnController } from "@/services/voucher.service";

export async function POST(request: Request) {
  const limited = rateLimit("voucher-check", 20, 10 * 60 * 1000);
  if (!limited.success) {
    return apiError("Too many checks. Please wait a moment.", "RATE_LIMITED", 429);
  }

  const body = (await request.json().catch(() => null)) as unknown;
  const parsed = voucherCheckSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid voucher code", "INVALID_INPUT");
  }

  const result = await checkVoucherOnController(parsed.data.locationId, parsed.data.code);
  if (!result.ok) {
    if (result.reason === "location_offline") {
      return apiError(result.message, "LOCATION_OFFLINE", 409);
    }
    const status = result.reason === "not_found" || result.reason === "no_location" ? 404 : 502;
    return apiError(result.message, result.reason === "not_found" ? "VOUCHER_NOT_FOUND" : "OMADA_LOOKUP_FAILED", status);
  }

  return apiSuccess(
    {
      code: parsed.data.code.trim(),
      status: result.facts.status,
      location: result.location,
      traffic: result.facts.traffic,
      duration: result.facts.duration,
      devices: result.facts.devices,
      expiresAt: result.facts.expiresAt,
    },
    "The voucher details are given below.",
  );
}
