import { prisma } from "@/lib/db/prisma";
import { apiError, apiSuccess } from "@/lib/api/response";
import { isOmadaCloudConfigured } from "@/lib/omada/config";
import { getEnv } from "@/lib/validation/env";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const env = getEnv();
    return apiSuccess(
      {
        application: "ONLINE",
        database: "ONLINE",
        paystack: env.PAYSTACK_SECRET_KEY ? "CONFIGURED" : "NOT_CONFIGURED",
        omada: isOmadaCloudConfigured() ? "CLOUD_CONFIGURED" : "NOT_CONFIGURED",
      },
      "Health check complete",
    );
  } catch {
    return apiError("Database unavailable", "DATABASE_OFFLINE", 503);
  }
}
