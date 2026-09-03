import { siteConfig } from "@/config/site";

export function SiteFooter({ supportPhone }: { supportPhone?: string | null }) {
  const year = new Date().getFullYear();
  const phone = supportPhone?.trim() || siteConfig.supportPhone;

  return (
    <footer className="px-4 py-8 text-center text-sm text-muted-foreground">
      <p className="font-medium text-foreground">TeckFirm WiFi</p>
      <p className="mt-1">A TeckFirm Service · {phone}</p>
      <p className="mt-3">© {year} TeckFirm. All rights reserved.</p>
    </footer>
  );
}
