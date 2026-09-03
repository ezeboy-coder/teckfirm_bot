import { PublicCatalogFeed } from "@/components/public/public-catalog-feed";
import { toPublicLocation, toPublicPlan } from "@/lib/catalog";
import { loadPublicCatalog } from "@/lib/db/catalog";
import { getSupportPhone } from "@/services/site-setting.service";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [{ locations, plans, databaseOnline }, supportPhone] = await Promise.all([
    loadPublicCatalog(),
    getSupportPhone().catch(() => null),
  ]);

  return (
    <PublicCatalogFeed
      initialLocations={locations.map(toPublicLocation)}
      initialPlans={plans.map(toPublicPlan)}
      databaseOnline={databaseOnline}
      supportPhone={supportPhone}
    />
  );
}
