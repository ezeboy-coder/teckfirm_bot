export type PublicLocation = {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  address: string | null;
  description: string | null;
  ssid: string | null;
  openingHours: string | null;
  supportPhone: string | null;
  planCount?: number;
};

export type PublicPlan = {
  id: string;
  name: string;
  description: string | null;
  locationId: string | null;
  locationName: string;
  locationSlug: string;
  priceKobo: number;
  duration: number;
  durationUnit: "MINUTES" | "HOURS" | "DAYS";
  dataAllowance: number | null;
  dataUnit: "MB" | "GB" | "UNLIMITED";
  speedLimitMbps: number | null;
  deviceLimit: number;
  featured: boolean;
};
