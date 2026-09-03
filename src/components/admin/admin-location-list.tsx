import Link from "next/link";
import { locationKindLabel } from "@/lib/locations/label";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { DeleteLocationButton } from "@/components/admin/delete-location-button";
import { LocationControllerStatus } from "@/components/admin/location-controller-status";

type AdminLocationRow = {
  id: string;
  name: string;
  kind: "COMMUNITY" | "COMMUNITY_AND_LODGE";
  vouchersOverall: number;
  vouchersToday: number;
  buyersToday: number;
  buyersOverall: number;
  omadaConfigured: boolean;
};

export function AdminLocationList({ locations }: { locations: AdminLocationRow[] }) {
  if (locations.length === 0) {
    return <p className="text-sm text-muted-foreground">None yet. Add one to start selling.</p>;
  }

  return (
    <ul className="space-y-3">
      {locations.map((location) => (
        <li key={location.id} className="rounded-lg border border-border/70 p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium">{location.name}</p>
            <LocationControllerStatus
              locationId={location.id}
              locationName={location.name}
              omadaConfigured={location.omadaConfigured}
            />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {locationKindLabel(location.kind)}
            {location.omadaConfigured ? " · Omada controller set" : " · Add Omada Device ID and Omada ID"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Today: {location.buyersToday} {location.buyersToday === 1 ? "buyer" : "buyers"} ·{" "}
            {location.vouchersToday} {location.vouchersToday === 1 ? "voucher" : "vouchers"}
          </p>
          <p className="text-sm text-muted-foreground">
            Overall: {location.buyersOverall} {location.buyersOverall === 1 ? "buyer" : "buyers"} ·{" "}
            {location.vouchersOverall} {location.vouchersOverall === 1 ? "voucher" : "vouchers"}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href={`/admin/locations/${location.id}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Manage location
            </Link>
            <DeleteLocationButton locationId={location.id} locationName={location.name} />
          </div>
        </li>
      ))}
    </ul>
  );
}
