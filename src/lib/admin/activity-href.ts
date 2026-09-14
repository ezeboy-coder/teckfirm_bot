import type { ActivityStatusFilter } from "@/lib/admin/order-status";
import type { ActivityDatePreset } from "@/lib/admin/activity-date";

export function activityHref(
  locationId: string,
  options: {
    status?: ActivityStatusFilter;
    when?: ActivityDatePreset;
    on?: string | null;
    page?: number;
  } = {},
) {
  const params = new URLSearchParams();
  const page = options.page ?? 1;
  const status = options.status ?? "all";
  const when = options.when ?? "all";

  if (page > 1) params.set("page", String(page));
  if (status !== "all") params.set("status", status);
  if (when !== "all") params.set("when", when);
  if (when === "custom" && options.on) params.set("on", options.on);

  const query = params.toString();
  return `/admin/locations/${locationId}${query ? `?${query}` : ""}`;
}
