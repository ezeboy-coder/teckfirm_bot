import { apiError, apiSuccess } from "@/lib/api/response";
import { toPublicPlan } from "@/lib/catalog";
import { planService } from "@/services/plan.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const plans = await planService.listPublic();
    const response = apiSuccess(plans.map(toPublicPlan), "Plans loaded");
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return apiError("Unable to load plans", "PLANS_UNAVAILABLE", 503);
  }
}
