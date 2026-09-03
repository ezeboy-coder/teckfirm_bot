import { apiError, apiSuccess } from "@/lib/api/response";
import { isDatabaseUnavailable } from "@/lib/db/catalog";
import { LOCATION_CONTROLLER_OFFLINE_MESSAGE } from "@/lib/locations/availability";
import { rateLimit, requestClientKey } from "@/lib/security/rate-limit";
import { locationService } from "@/services/location.service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const locationId = id.trim();
  if (!locationId) {
    return apiError("Choose a location.", "INVALID_INPUT");
  }

  const limited = rateLimit(`location-live:${requestClientKey(request)}:${locationId}`, 20, 10 * 60 * 1000);
  if (!limited.success) {
    return apiError("Too many location checks. Please wait a moment.", "RATE_LIMITED", 429);
  }

  try {
    const result = await locationService.getGuestControllerStatus(locationId);
    if (!result.ok) {
      if (result.reason === "not_found") {
        return apiError("That location was not found.", "NOT_FOUND", 404);
      }
      return apiError(result.message ?? LOCATION_CONTROLLER_OFFLINE_MESSAGE, "LOCATION_OFFLINE", 409);
    }

    const response = apiSuccess({ live: true }, "This location is active.");
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return apiError("Unable to check this location right now.", "DATABASE_OFFLINE", 503);
    }
    return apiError(LOCATION_CONTROLLER_OFFLINE_MESSAGE, "LOCATION_OFFLINE", 409);
  }
}
