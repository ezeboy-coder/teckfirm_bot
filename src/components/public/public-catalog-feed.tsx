"use client";

import { DatabaseOfflineBanner } from "@/components/public/database-offline-banner";
import { WifiBot } from "@/components/public/wifi-bot";
import { useLiveCatalog } from "@/hooks/use-live-catalog";
import { displayName } from "@/lib/utils/display";
import { formatNgnFromKobo } from "@/lib/utils/money";
import type { PublicLocation, PublicPlan } from "@/types/catalog";

export function PublicCatalogFeed({
  initialLocations,
  initialPlans,
  databaseOnline,
  supportPhone = null,
}: {
  initialLocations: PublicLocation[];
  initialPlans: PublicPlan[];
  databaseOnline: boolean;
  supportPhone?: string | null;
}) {
  const { locations, plans, refreshCatalog } = useLiveCatalog(initialLocations, initialPlans);
  const fromPrice = plans.length ? Math.min(...plans.map((plan) => plan.priceKobo)) : null;
  const locationNames = [...new Set(locations.map((item) => displayName(item.name)))];

  return (
    <div className="pb-10">
      {databaseOnline ? null : <DatabaseOfflineBanner />}
      <section className="mx-auto max-w-lg px-4 pt-8 pb-6 text-center sm:max-w-xl">
        <p className="text-sm text-muted-foreground">
          TeckFirm hotspots
          {locationNames.length ? ` · ${locationNames.length} locations` : ""}
        </p>
        <h1 className="font-heading mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Buy WiFi in a chat.
        </h1>
        <p className="mt-3 text-muted-foreground text-pretty">
          Pick a location, choose a plan, pay, and your voucher appears here.
          {fromPrice ? ` Plans from ${formatNgnFromKobo(fromPrice)}.` : ""}
        </p>
      </section>
      <WifiBot
        locations={locations}
        plans={plans}
        refreshCatalog={refreshCatalog}
        supportPhone={supportPhone}
      />
      <ol className="mx-auto mt-10 grid max-w-lg gap-3 px-4 text-sm sm:max-w-xl sm:grid-cols-3">
        {[
          { n: "1", t: "Chat", d: "Choose hotspot and plan." },
          { n: "2", t: "Pay", d: "Checkout with Paystack." },
          { n: "3", t: "Connect", d: "Use the voucher on WiFi." },
        ].map((step) => (
          <li key={step.n} className="rounded-2xl bg-muted/60 px-4 py-3">
            <p className="text-xs font-semibold tracking-wide text-primary">{step.n}</p>
            <p className="font-medium">{step.t}</p>
            <p className="text-muted-foreground">{step.d}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
