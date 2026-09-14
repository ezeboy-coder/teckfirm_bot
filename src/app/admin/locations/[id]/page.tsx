import Link from "next/link";
import { notFound } from "next/navigation";
import { locationKindLabel } from "@/lib/locations/label";
import { formatLagosDateTime } from "@/lib/time/nigeria";
import { formatNgnFromKobo } from "@/lib/utils/money";
import { locationService } from "@/services/location.service";
import { DeleteLocationButton } from "@/components/admin/delete-location-button";
import { EditLocationNameForm } from "@/components/admin/edit-location-name-form";
import {
  ActivityDateControls,
  ActivityStatusControls,
} from "@/components/admin/activity-status-controls";
import { activityHref } from "@/lib/admin/activity-href";
import { LocationOrderStatus } from "@/components/admin/location-order-status";
import { Button } from "@/components/ui/button";
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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; status?: string; when?: string; on?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const page = Number.parseInt(query.page ?? "1", 10);
  const dashboard = await locationService.getAdminDashboard(
    id,
    page,
    query.status ?? null,
    query.when ?? null,
    query.on ?? null,
  );
  if (!dashboard) {
    notFound();
  }

  const { location, stats, activity, activityPage } = dashboard;
  const from =
    activityPage.total === 0 ? 0 : (activityPage.page - 1) * activityPage.pageSize + 1;
  const to = Math.min(activityPage.page * activityPage.pageSize, activityPage.total);
  const statusFilter = activityPage.statusFilter;
  const dateFilter = activityPage.dateFilter;
  const pageHref = (nextPage: number) =>
    activityHref(location.id, {
      status: statusFilter,
      when: dateFilter.preset,
      on: dateFilter.on,
      page: nextPage,
    });

  const emptyMessage =
    dateFilter.preset === "custom" && !dateFilter.start
      ? "Pick a date to filter activity."
      : statusFilter === "all" && dateFilter.preset === "all"
        ? "No purchases at this location yet."
        : "No purchases match these filters.";

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
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle>Activity</CardTitle>
          <ActivityDateControls
            locationId={location.id}
            statusFilter={statusFilter}
            dateFilter={dateFilter}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          {activityPage.total === 0 ? (
            <div className="space-y-3">
              <div className="flex justify-end">
                <ActivityStatusControls
                  locationId={location.id}
                  statusFilter={statusFilter}
                  dateFilter={dateFilter}
                />
              </div>
              <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>
                      <ActivityStatusControls
                        locationId={location.id}
                        statusFilter={statusFilter}
                        dateFilter={dateFilter}
                      />
                    </TableHead>
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Showing {from}–{to} of {activityPage.total}
                </p>
                <div className="flex items-center gap-2">
                  {activityPage.page > 1 ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      render={<Link href={pageHref(activityPage.page - 1)} scroll={false} />}
                    >
                      Previous
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="h-8" disabled>
                      Previous
                    </Button>
                  )}
                  <span className="text-sm text-muted-foreground">
                    Page {activityPage.page} of {activityPage.totalPages}
                  </span>
                  {activityPage.page < activityPage.totalPages ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      render={<Link href={pageHref(activityPage.page + 1)} scroll={false} />}
                    >
                      Next
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="h-8" disabled>
                      Next
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
