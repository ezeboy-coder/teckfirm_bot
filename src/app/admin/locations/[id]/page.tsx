import Link from "next/link";
import { notFound } from "next/navigation";
import { locationKindLabel } from "@/lib/locations/label";
import { formatLagosDateTime } from "@/lib/time/nigeria";
import { formatNgnFromKobo } from "@/lib/utils/money";
import { locationService } from "@/services/location.service";
import { DeleteLocationButton } from "@/components/admin/delete-location-button";
import { EditLocationNameForm } from "@/components/admin/edit-location-name-form";
import { LocationOrderStatus } from "@/components/admin/location-order-status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function ManageLocationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dashboard = await locationService.getAdminDashboard(id);
  if (!dashboard) {
    notFound();
  }

  const { location, stats, activity } = dashboard;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin" className="text-sm text-muted-foreground underline">
            Back to admin
          </Link>
          <h1 className="font-heading mt-2 text-2xl font-semibold">{location.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {locationKindLabel(location.kind)}
          </p>
        </div>
        <DeleteLocationButton locationId={location.id} locationName={location.name} from="manage" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Buyers today</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stats.buyersToday}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Buyers overall</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stats.buyersOverall}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Vouchers today</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stats.vouchersToday}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Vouchers overall</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stats.vouchersOverall}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Made today</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {formatNgnFromKobo(stats.revenueTodayKobo)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Made overall</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {formatNgnFromKobo(stats.revenueOverallKobo)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Location name</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <EditLocationNameForm
            locationId={location.id}
            kind={location.kind}
            community={location.community}
            lodgeName={location.lodgeName ?? ""}
          />
          <div>
            <p className="text-sm font-medium">Omada controller</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {location.omadaDeviceId && location.omadaId
                ? "Device ID and Omada ID are locked on this location. Vouchers stay on this controller."
                : "This location has no Omada controller IDs. Add a new location to attach a controller."}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No purchases at this location yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activity.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{formatLagosDateTime(row.at)}</TableCell>
                    <TableCell>
                      <span className="block">{row.buyer}</span>
                      <span className="text-xs text-muted-foreground">{row.contact}</span>
                    </TableCell>
                    <TableCell>{row.plan}</TableCell>
                    <TableCell>{formatNgnFromKobo(row.amountKobo)}</TableCell>
                    <TableCell>
                      <LocationOrderStatus
                        orderId={row.id}
                        locationId={location.id}
                        statusLabel={row.statusLabel}
                        createdAt={row.createdAt}
                        isOpenPending={row.isOpenPending}
                        needsVoucher={row.needsVoucher}
                        referenceTail={row.referenceTail}
                        canResolve={row.canResolve}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
