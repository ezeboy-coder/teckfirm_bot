import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { getSupportPhone } from "@/services/site-setting.service";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supportPhone = await getSupportPhone().catch(() => null);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter supportPhone={supportPhone} />
    </div>
  );
}
