import { siteConfig } from "@/config/site";
import { WhatsAppIcon } from "@/components/public/whatsapp-icon";
import { toWhatsAppUrl } from "@/lib/utils/phone";

export function SiteFooter({ supportPhone }: { supportPhone?: string | null }) {
  const year = new Date().getFullYear();
  const phone = supportPhone?.trim() || siteConfig.supportPhone;
  const whatsappUrl = toWhatsAppUrl(phone);

  return (
    <footer className="px-4 py-8 text-center text-sm text-muted-foreground">
      <p className="font-medium text-foreground">TeckFirm WiFi</p>
      <div className="mt-2 flex items-center justify-center gap-2">
        <p>A TeckFirm Service</p>
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Contact support on WhatsApp"
            className="inline-flex size-9 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm transition hover:bg-[#1ebe57] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#25D366]/40"
          >
            <WhatsAppIcon className="size-5" />
          </a>
        ) : (
          <p>· {phone}</p>
        )}
      </div>
      <p className="mt-3">© {year} TeckFirm. All rights reserved.</p>
    </footer>
  );
}
