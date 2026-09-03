import { apiError, apiSuccess } from "@/lib/api/response";
import { requireAdminApi } from "@/lib/auth/admin-api";
import { locationOmadaController, withOmadaController } from "@/lib/omada/context";
import { OmadaError, OmadaNotConfiguredError } from "@/lib/omada/errors";
import { getSites } from "@/lib/omada/sites";
import { getLocationById } from "@/repositories/location.repository";

export async function GET(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const locationId = new URL(request.url).searchParams.get("locationId")?.trim() ?? "";
  if (!locationId) {
    return apiError("Choose a location to list sites.", "INVALID_INPUT");
  }

  const location = await getLocationById(locationId);
  if (!location) {
    return apiError("That location was not found.", "NOT_FOUND", 404);
  }

  try {
    const sites = await withOmadaController(locationOmadaController(location), () => getSites());
    return apiSuccess({ sites }, "Omada sites loaded.");
  } catch (error) {
    if (error instanceof OmadaNotConfiguredError) {
      return apiError(error.message, error.code, 400);
    }
    if (error instanceof OmadaError) {
      return apiError(error.message, error.code, 502);
    }
    return apiError("Could not load Omada sites.", "OMADA_SITES_FAILED", 502);
  }
}
