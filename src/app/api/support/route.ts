import { apiError, apiSuccess } from "@/lib/api/response";
import { isDatabaseUnavailable } from "@/lib/db/catalog";
import { getSupportPhone } from "@/services/site-setting.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supportPhone = await getSupportPhone();
    const response = apiSuccess({ supportPhone }, "Support contact loaded");
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return apiError("Unable to load support contact.", "DATABASE_OFFLINE", 503);
    }
    return apiError("Unable to load support contact.", "SUPPORT_UNAVAILABLE", 500);
  }
}
