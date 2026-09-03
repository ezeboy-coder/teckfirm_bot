import { apiError, apiSuccess } from "@/lib/api/response";
import { requireAdminApi } from "@/lib/auth/admin-api";
import { locationOmadaController, withOmadaController } from "@/lib/omada/context";
import { OmadaError, OmadaNotConfiguredError } from "@/lib/omada/errors";
import { testOmadaConnection } from "@/lib/omada/sites";
import { getLocationById } from "@/repositories/location.repository";

export async function GET(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const locationId = new URL(request.url).searchParams.get("locationId")?.trim() ?? "";
  if (!locationId) {
    return apiError("Choose a location to test.", "INVALID_INPUT");
  }

  const location = await getLocationById(locationId);
  if (!location) {
    return apiError("That location was not found.", "NOT_FOUND", 404);
  }

  try {
    const result = await withOmadaController(locationOmadaController(location), () =>
      testOmadaConnection(),
    );
    return apiSuccess(
      {
        connected: result.connected,
        siteCount: result.siteCount,
        sites: result.sites,
      },
      "Omada Cloud Access reached this location’s controller.",
    );
  } catch (error) {
    if (error instanceof OmadaNotConfiguredError) {
      return apiError(error.message, error.code, 400);
    }
    if (error instanceof OmadaError) {
      return apiError(error.message, error.code, 502);
    }
    return apiError("Omada Cloud Access connection failed.", "OMADA_CONNECTION_FAILED", 502);
  }
}
