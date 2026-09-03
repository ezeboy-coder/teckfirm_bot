import { apiError, apiSuccess } from "@/lib/api/response";
import { toPublicLocation } from "@/lib/catalog";
import { locationService } from "@/services/location.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const locations = await locationService.listPublic();
    const response = apiSuccess(locations.map(toPublicLocation), "Locations loaded");
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return apiError("Unable to load locations", "LOCATIONS_UNAVAILABLE", 503);
  }
}
