import { prisma } from "@/lib/db/prisma";
import { locationService } from "@/services/location.service";
import { planService } from "@/services/plan.service";
import { getSupportPhone } from "@/services/site-setting.service";
import { formatNgnFromKobo } from "@/lib/utils/money";
import { AddLocationForm } from "@/components/admin/add-location-form";
import { AddPriceForm } from "@/components/admin/add-price-form";
import { AdminLocationList } from "@/components/admin/admin-location-list";
import { AdminPriceList } from "@/components/admin/admin-price-list";
import { SupportPhoneForm } from "@/components/admin/support-phone-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function AdminHomePage() {
  const [vouchersBought, revenue, locations, plans, supportPhone] = await Promise.all([
    prisma.voucher.count(),
    prisma.payment.aggregate({
      _sum: { amountKobo: true },
      where: { status: "SUCCESS" },
    }),
    locationService.listAdminDashboard(),
    planService.listAdmin(),
    getSupportPhone(),
  ]);

  const totalPriceKobo = revenue._sum.amountKobo ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add communities and lodges here. Each location is one Omada controller.
          Plans you set apply to every location. Vouchers stay on the controller
          you attach to that location.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vouchers bought</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{vouchersBought}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total made</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{formatNgnFromKobo(totalPriceKobo)}</CardContent>
        </Card>
      </div>

      <Tabs defaultValue="catalog" className="gap-4">
        <TabsList>
          <TabsTrigger value="catalog">Locations & plans</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
        </TabsList>
        <TabsContent value="catalog">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Add location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <AddLocationForm />
                <div>
                  <p className="mb-2 text-sm font-medium">Live locations</p>
                  <AdminLocationList locations={locations} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Add plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <AddPriceForm />
                <div>
                  <p className="mb-2 text-sm font-medium">Live plans</p>
                  <AdminPriceList plans={plans} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="support">
          <Card className="max-w-lg">
            <CardHeader>
              <CardTitle>Support phone</CardTitle>
            </CardHeader>
            <CardContent>
              <SupportPhoneForm currentPhone={supportPhone ?? ""} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
