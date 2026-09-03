"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicLocation, PublicPlan } from "@/types/catalog";

type CatalogPayload<T> = {
  success: boolean;
  data?: T;
};

export type LiveCatalog = {
  locations: PublicLocation[];
  plans: PublicPlan[];
};

function fingerprint(locations: PublicLocation[], plans: PublicPlan[]) {
  return [
    ...locations.map((item) => `${item.id}:${item.name}`),
    ...plans.map(
      (item) =>
        `${item.id}:${item.priceKobo}:${item.name}:${item.dataAllowance ?? ""}:${item.deviceLimit}:${item.dataUnit}:${item.duration}:${item.durationUnit}`,
    ),
  ].join("|");
}

export function useLiveCatalog(initialLocations: PublicLocation[], initialPlans: PublicPlan[]) {
  const [locations, setLocations] = useState(initialLocations);
  const [plans, setPlans] = useState(initialPlans);
  const latest = useRef<LiveCatalog>({ locations: initialLocations, plans: initialPlans });
  const stamp = useRef(fingerprint(initialLocations, initialPlans));

  const apply = useCallback((nextLocations: PublicLocation[], nextPlans: PublicPlan[]) => {
    const next = fingerprint(nextLocations, nextPlans);
    latest.current = { locations: nextLocations, plans: nextPlans };
    if (next === stamp.current) return;
    stamp.current = next;
    setLocations(nextLocations);
    setPlans(nextPlans);
  }, []);

  useEffect(() => {
    apply(initialLocations, initialPlans);
  }, [apply, initialLocations, initialPlans]);

  const refreshCatalog = useCallback(async (): Promise<LiveCatalog> => {
    try {
      const [locationsRes, plansRes] = await Promise.all([
        fetch("/api/locations", { cache: "no-store" }),
        fetch("/api/plans", { cache: "no-store" }),
      ]);
      const locationsJson = (await locationsRes.json()) as CatalogPayload<PublicLocation[]>;
      const plansJson = (await plansRes.json()) as CatalogPayload<PublicPlan[]>;
      if (
        locationsJson.success &&
        Array.isArray(locationsJson.data) &&
        plansJson.success &&
        Array.isArray(plansJson.data)
      ) {
        apply(locationsJson.data, plansJson.data);
        return { locations: locationsJson.data, plans: plansJson.data };
      }
    } catch {
      // Keep the last good catalog if a fetch fails.
    }
    return latest.current;
  }, [apply]);

  return { locations, plans, refreshCatalog };
}
