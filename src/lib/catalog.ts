import type { Location, Plan } from "@prisma/client";
import type { PublicLocation, PublicPlan } from "@/types/catalog";

export function toPublicLocation(
  location: Location & { _count?: { plans: number } },
): PublicLocation {
  return {
    id: location.id,
    name: location.name,
    slug: location.slug,
    city: location.city,
    state: location.state,
    address: location.address,
    description: location.description,
    ssid: location.ssid,
    openingHours: location.openingHours,
    supportPhone: location.supportPhone,
    planCount: location._count?.plans,
  };
}

export function toPublicPlan(plan: Plan & { location: Location | null }): PublicPlan {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    locationId: plan.locationId,
    locationName: plan.location?.name ?? "All locations",
    locationSlug: plan.location?.slug ?? "all",
    priceKobo: plan.priceKobo,
    duration: plan.duration,
    durationUnit: plan.durationUnit,
    dataAllowance: plan.dataAllowance,
    dataUnit: plan.dataUnit,
    speedLimitMbps: plan.speedLimitMbps,
    deviceLimit: plan.deviceLimit,
    featured: plan.featured,
  };
}
