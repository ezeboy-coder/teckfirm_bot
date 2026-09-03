import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import { locationService } from "@/services/location.service";
import { planService } from "@/services/plan.service";

export function isDatabaseUnavailable(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Can't reach database server") ||
    message.includes("P1001") ||
    message.includes("P1000")
  );
}

export async function loadPublicCatalog() {
  try {
    const [locations, featured, plans] = await Promise.all([
      locationService.listPublic(),
      planService.listFeatured(),
      planService.listPublic(),
    ]);

    return { locations, featured, plans, databaseOnline: true as const };
  } catch (error) {
    if (!isDatabaseUnavailable(error)) {
      throw error;
    }

    logger.warn("Catalog database is unavailable", {
      error: error instanceof Error ? error.message : "unknown",
    });

    return {
      locations: [],
      featured: [],
      plans: [],
      databaseOnline: false as const,
    };
  }
}
